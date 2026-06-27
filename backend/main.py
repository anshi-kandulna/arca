from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Form
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import json
import os
import uuid
import uvicorn
import shutil

import auth
from db import database, models, schemas, crud
from run_pipeline import run_full_pipeline
from validation_agent.validation_agent import run_validation_background

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ARCA Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB (in a real app we'd use Alembic)
models.Base.metadata.create_all(bind=database.engine)

@app.post("/api/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # For demo: accept "password" as valid password for all users
    if not auth.verify_password(form_data.password, "password"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

def process_circular_background(circular_id: str, pdf_path: str, output_json_path: str, bank_id: str):
    try:
        run_full_pipeline(pdf_path, output_json_path, ollama_model="qwen2.5:7b")
        
        db = database.SessionLocal()
        try:
            if not os.path.exists(output_json_path):
                raise Exception(f"AI Pipeline failed to produce output json at {output_json_path}. Check extraction agent logs.")
                
            with open(output_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            circular = crud.get_circular(db, circular_id)
            if circular:
                extracted_ref = data.get("circular_id")
                if extracted_ref:
                    circular.ref_number = extracted_ref
                    
                extracted_title = data.get("circular_title")
                if extracted_title:
                    circular.title = extracted_title
                    
                if data.get("circular_date"):
                    try:
                        circular.published_date = datetime.strptime(data["circular_date"], "%Y-%m-%d").date()
                    except:
                        pass
                
                circular.total_pages = data.get("total_pages")
                circular.page_summary = data.get("page_summary")
                circular.vertical_summary = data.get("department_summary")
                circular.sub_vertical_summary = data.get("sub_vertical_summary")
                circular.priority_summary = data.get("priority_summary")
                circular.total_obligations = data.get("total_maps", 0)
                
                for map_item in data.get("maps", []):
                    crud.create_map(db, {
                        "circular_id": circular.id,
                        "bank_id": bank_id,
                        "map_ref": map_item["map_id"],
                        "obligation_text": map_item["action"],
                        "business_vertical": map_item["department"],
                        "sub_vertical": map_item.get("sub_vertical"),
                        "routing_confidence": map_item.get("routing_confidence"),
                        "deadline_raw": map_item.get("deadline_raw"),
                        "clause_ref": map_item["clause_ref"],
                        "priority": map_item["priority"],
                        "page_no": map_item["page_no"]
                    })
                    
                    if map_item["department"] and map_item["department"] != "Unassigned":
                        # We no longer create notifications here. Notifications are deferred until manual dispatch.
                        pass
                
                crud.update_circular(db, circular, {"status": "pending_review"})
        finally:
            db.close()
    except Exception as e:
        print(f"Background task failed: {e}")
        db = database.SessionLocal()
        try:
            circular = crud.get_circular(db, circular_id)
            if circular:
                crud.update_circular(db, circular, {"status": "failed"})
        finally:
            db.close()

@app.post("/api/circulars/upload", response_model=schemas.CircularUploadResponse)
async def upload_circular(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role not in ["compliance_officer", "system_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to upload circulars")
        
    try:
        uploads_dir = os.path.join(os.path.dirname(__file__), "arca", "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        pdf_path = os.path.join(uploads_dir, file.filename)
        
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        circular = crud.create_circular(
            db=db,
            bank_id=current_user.bank_id,
            ref_number=f"UPL-{uuid.uuid4().hex[:6]}",
            title=file.filename,
            file_path=file.filename
        )
        
        # Audit Log
        crud.create_audit_log(
            db=db,
            bank_id=str(current_user.bank_id),
            user_id=str(current_user.id),
            actor=current_user.full_name or current_user.email,
            actor_role=current_user.role,
            action="Circular Uploaded",
            action_type="CIRCULAR_UPLOADED",
            circular_ref=circular.ref_number,
            details=f"Circular '{file.filename}' uploaded and queued for processing."
        )
        
        output_json_path = os.path.join(uploads_dir, f"{circular.id}_output.json")
        
        background_tasks.add_task(
            process_circular_background, 
            str(circular.id), 
            pdf_path, 
            output_json_path, 
            str(current_user.bank_id)
        )
        
        return {
            "message": "Circular is processing in the background",
            "circular_id": str(circular.id),
            "total_maps": 0
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard")
def get_dashboard_stats(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    # Depending on role, we might filter. For now, fetch all for the bank
    circulars = crud.get_circulars_by_bank(db, current_user.bank_id)
    maps = crud.get_maps_by_bank(db, current_user.bank_id)
    
    # Calculate overdue maps (mock logic: assume some are overdue based on deadline_raw parsing, or just mock count for now)
    overdue_count = 0
    upcoming_count = 0
    # In a real scenario, we'd parse deadline_raw to date and compare with today.
    # For now, let's just count all maps as "Upcoming"
    upcoming_count = len(maps)
    
    # Calculate compliance rate
    total_obligations = sum(c.total_obligations or 0 for c in circulars)
    completed_obligations = sum(c.completed_obligations or 0 for c in circulars)
    compliance_rate = 0 if total_obligations == 0 else round((completed_obligations / total_obligations) * 100, 1)
    
    # Use the most recent circular for department health
    recent_circular = max(circulars, key=lambda x: x.published_date) if circulars else None
    dept_data = []
    if recent_circular and recent_circular.vertical_summary:
        for dept, stats in recent_circular.vertical_summary.items():
            if isinstance(stats, dict):
                compliant = stats.get("compliant", 0)
                total = stats.get("total", 1)
            else:
                compliant = 0
                total = stats if isinstance(stats, int) else 1
            
            dept_data.append({
                "dept": dept,
                "rate": round((compliant / max(total, 1)) * 100, 1)
            })
            
    # Priority summary for trend Data (mocking trend for now)
    trend_data = [
        {'week': 'W1', 'rate': max(0, compliance_rate - 10), 'target': 85},
        {'week': 'W2', 'rate': max(0, compliance_rate - 5), 'target': 85},
        {'week': 'W3', 'rate': compliance_rate, 'target': 85},
    ]

    return {
        "metrics": {
            "gate1": len([c for c in circulars if c.status == 'processing']),
            "overdue": overdue_count,
            "compliance": compliance_rate,
            "deadlines": upcoming_count
        },
        "trendData": trend_data,
        "deptData": dept_data,
        "recent_circulars": [
            {
                "id": str(c.id),
                "title": c.title,
                "ref_number": c.ref_number,
                "status": c.status,
                "date": c.published_date
            } for c in circulars
        ]
    }

@app.get("/api/circulars")
def get_circulars(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    circulars = crud.get_circulars_by_bank(db, current_user.bank_id)
    result = []
    for c in circulars:
        maps = crud.get_maps_by_bank(db, current_user.bank_id, str(c.id))
        total = len(maps)
        # Any map that has moved past the draft/rejected stage is considered "completed" from the Compliance Officer's initial review perspective, 
        # or we consider it completed when it's fully closed. But since the progress bar is out of "total MAPs" dispatched or processed,
        # let's count anything that is not draft, pending, or rejected.
        completed = len([m for m in maps if m.status not in ["draft", "pending", "rejected"]])
        
        result.append({
            "id": str(c.id),
            "refNumber": c.ref_number,
            "title": c.title,
            "category": c.category or "General",
            "publishedDate": str(c.published_date),
            "detectedDate": str(c.created_at),
            "totalObligations": total if total > 0 else c.total_obligations,
            "completedObligations": completed,
            "status": c.status if c.status in ['pending_review', 'in_progress', 'completed', 'overdue'] else 'pending_review',
            "arcaConfidence": 95, # Mock confidence
            "priority": c.priority
        })
    return result

@app.post("/api/circulars/{circular_id}/dispatch")
def dispatch_circular(
    circular_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role not in ["compliance_officer", "system_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to dispatch")
        
    circular = crud.get_circular(db, circular_id)
    if not circular:
        raise HTTPException(status_code=404, detail="Circular not found")
        
    crud.update_circular(db, circular, {"status": "in_progress"})
    
    maps = crud.get_maps_by_bank(db, current_user.bank_id, circular_id)
    approved_maps = [m for m in maps if m.status == "approved"]
    
    for m in approved_maps:
        crud.update_map(db, m, {"status": "pending_evidence"})
        if m.business_vertical and m.business_vertical != "Unassigned":
            # Using full obligation text without the [:80] truncation
            msg = f"New obligation assigned from circular {circular.ref_number}: {m.obligation_text}"
            crud.create_notification(db, bank_id=str(current_user.bank_id), business_vertical=m.business_vertical, message=msg)
            
    # Audit Log
    crud.create_audit_log(
        db=db,
        bank_id=str(current_user.bank_id),
        user_id=str(current_user.id),
        actor=current_user.full_name or current_user.email,
        actor_role=current_user.role,
        action="MAPs Dispatched",
        action_type="MAPS_DISPATCHED",
        circular_ref=circular.ref_number,
        details=f"Dispatched {len(approved_maps)} approved MAPs to departments."
    )
            
    return {"message": f"Dispatched {len(approved_maps)} MAPs successfully"}

@app.get("/api/maps")
def get_maps(
    circular_id: str = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    business_vertical_name = None
    if current_user.role in ['department_user', 'department_head']:
        user_dept = crud.get_business_vertical(db, current_user.business_vertical_id)
        if user_dept:
            business_vertical_name = user_dept.name
        else:
            return [] # No department assigned, return empty
            
    maps = crud.get_maps_by_bank(db, current_user.bank_id, circular_id, business_vertical_name)
    
    return [
        {
            "id": str(m.id),
            "mapId": m.map_ref,
            "circularId": str(m.circular_id),
            "action": m.obligation_text,
            "department": m.business_vertical,
            "deadline": m.deadline_raw,
            "priority": m.priority,
            "status": m.status,
            "clauseRef": m.clause_ref,
            "pageNo": m.page_no,
            "matchedText": m.matched_text,
            "bbox": m.bbox
        } for m in maps
    ]

@app.patch("/api/maps/{map_id}")
def update_map(
    map_id: str,
    map_update: schemas.MapUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    db_map = crud.get_map(db, map_id)
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
        
    update_data = map_update.dict(exclude_unset=True)
    crud.update_map(db, db_map, update_data)
    return {"message": "Map updated successfully", "status": db_map.status}

@app.post("/api/maps/{map_id}/evidence")
async def upload_evidence(
    map_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    db_map = crud.get_map(db, map_id)
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
        
    # Save file to disk securely
    uploads_dir = os.path.join(os.path.dirname(__file__), "arca", "uploads", "evidence")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create Evidence
    db_evidence = crud.create_evidence(
        db=db,
        map_id=db_map.id,
        submitted_by=str(current_user.id),
        file_name=file.filename,
        file_path=file_path,
        notes=notes
    )
    
    # Update map status
    crud.update_map(db, db_map, {"status": "under_review"})
    
    # Audit Log
    circular = crud.get_circular(db, db_map.circular_id)
    crud.create_audit_log(
        db=db,
        bank_id=str(current_user.bank_id),
        user_id=str(current_user.id),
        actor=current_user.full_name or current_user.email,
        actor_role=current_user.role,
        action="Evidence Submitted",
        action_type="EVIDENCE_SUBMITTED",
        circular_ref=circular.ref_number if circular else None,
        map_ref=db_map.map_ref,
        business_vertical=db_map.business_vertical,
        details=f"Evidence '{file.filename}' submitted for MAP."
    )
    
    # Trigger background validation
    background_tasks.add_task(run_validation_background, str(db_evidence.id))

    return {"message": "Evidence submitted successfully"}

@app.get("/api/validations")
def get_validations(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    # Fetch MAPs that are 'under_review'
    maps_under_review = crud.get_maps_by_status(db, "under_review")
    results = []
    
    for m in maps_under_review:
        evidence = crud.get_latest_evidence_for_map(db, m.id)
        if evidence:
            verdict = crud.get_latest_verdict_for_evidence(db, evidence.id)
            if verdict:
                circ = m.circular
                results.append({
                    "id": str(verdict.id),
                    "mapId": m.map_ref,
                    "circularRef": circ.ref_number if circ else "",
                    "mapAction": m.obligation_text,
                    "department": m.business_vertical,
                    "evidenceFile": evidence.file_name,
                    "evidenceNotes": evidence.notes,
                    "verdict": verdict.verdict,
                    "confidence": verdict.confidence,
                    "reasoning": verdict.reasoning,
                    "missingElements": verdict.missing_elements,
                    "signalBreakdown": verdict.signal_breakdown,
                    "map_db_id": str(m.id)
                })
    return results

@app.post("/api/validations/{validation_id}/decide")
def decide_validation(
    validation_id: str,
    decision: schemas.ValidationDecision,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    verdict = crud.get_validation_verdict(db, validation_id)
    if not verdict:
        raise HTTPException(status_code=404, detail="Validation not found")
        
    evidence = crud.get_evidence(db, verdict.evidence_id)
    db_map = crud.get_map(db, evidence.map_id)
    
    new_status = db_map.status
    if decision.action == "Confirm Close":
        new_status = "closed"
    elif decision.action == "Override":
        new_status = "closed" # Overridden to closed
    elif decision.action == "Request Resubmission":
        new_status = "rework_required"
        
    crud.update_map(db, db_map, {"status": new_status})
    return {"message": f"Action {decision.action} recorded"}

@app.get("/api/departments/stats")
def get_departments_stats(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    maps = crud.get_maps_by_bank(db, current_user.bank_id)
    
    # Compute stats per vertical
    stats = {}
    for m in maps:
        v = m.business_vertical or "Unassigned"
        if v not in stats:
            stats[v] = {"total": 0, "completed": 0, "pending": 0, "overdue": 0}
            
        stats[v]["total"] += 1
        if m.status in ["closed", "verified"]:
            stats[v]["completed"] += 1
        elif m.status == "overdue":
            stats[v]["overdue"] += 1
        else:
            stats[v]["pending"] += 1
            
    result = []
    for dept, s in stats.items():
        health = 0 if s["total"] == 0 else round((s["completed"] / s["total"]) * 100)
        result.append({
            "id": dept,
            "name": dept,
            "head": "Dept Head", # Mock head for now
            "totalTasks": s["total"],
            "completedTasks": s["completed"],
            "overdueTasks": s["overdue"],
            "pendingTasks": s["pending"],
            "healthScore": health,
            "tasks": [] # Not passing full tasks array for overview
        })
    return result

@app.get("/api/audit")
def get_audit_logs(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    user_id = str(current_user.id) if current_user.role not in ['system_admin', 'compliance_officer'] else None
    logs = crud.get_audit_logs(db, current_user.bank_id, user_id=user_id)
    return [
        {
            "id": str(log.id),
            "timestamp": log.created_at.strftime("%d %b %Y, %H:%M IST"),
            "actor": log.actor,
            "actorRole": log.actor_role,
            "action": log.action,
            "actionType": log.action_type,
            "circularRef": log.circular_ref,
            "mapId": log.map_ref,
            "department": log.business_vertical,
            "details": log.details
        } for log in logs
    ]

@app.get("/api/notifications", response_model=list[schemas.Notification])
def get_notifications(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role not in ['department_user', 'department_head']:
        return [] # Compliance officer doesn't see routing notifications as per user request
    
    user_dept = crud.get_business_vertical(db, current_user.business_vertical_id)
    if not user_dept:
        return []
        
    return crud.get_recent_notifications(db, current_user.bank_id, user_dept.name, days=3)

@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    notification = crud.mark_notification_read(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)