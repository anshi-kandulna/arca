from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import json
import os
import uuid
import uvicorn

import auth
from db import database, models, schemas

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ARCA Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Specific origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB (in a real app we'd use Alembic)
models.Base.metadata.create_all(bind=database.engine)

@app.post("/api/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
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

@app.post("/api/circulars/upload", response_model=schemas.CircularUploadResponse)
async def upload_circular(
    file: UploadFile = File(...), 
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "compliance_officer":
        raise HTTPException(status_code=403, detail="Not authorized to upload circulars")
        
    # In a real app we'd save the file. Here we mock processing by reading arca_output.json
    try:
        output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "arca_output.json")
        with open(output_path, "r") as f:
            data = json.load(f)
            
        # Create circular
        circular = models.Circular(
            bank_id=current_user.bank_id,
            ref_number=data["circular_id"],
            title=data["circular_title"],
            published_date=data["circular_date"],
            file_path=file.filename,
            total_pages=data.get("total_pages"),
            page_summary=data.get("page_summary"),
            department_summary=data.get("department_summary"),
            priority_summary=data.get("priority_summary"),
            total_obligations=data.get("total_maps", 0),
            status="processing"
        )
        db.add(circular)
        db.commit()
        db.refresh(circular)
        
        # Load maps
        for map_item in data.get("maps", []):
            db_map = models.Map(
                circular_id=circular.id,
                bank_id=current_user.bank_id,
                map_ref=map_item["map_id"],
                obligation_text=map_item["action"],
                department_raw=map_item["department_raw"],
                deadline_raw=map_item["deadline_raw"],
                clause_ref=map_item["clause_ref"],
                priority=map_item["priority"],
                page_no=map_item["page_no"],
            )
            db.add(db_map)
        
        # Mark complete
        circular.status = "detected"
        db.commit()
        
        return {
            "message": "Circular successfully processed",
            "circular_id": str(circular.id),
            "total_maps": circular.total_obligations
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
    circulars = db.query(models.Circular).filter(models.Circular.bank_id == current_user.bank_id).all()
    maps = db.query(models.Map).filter(models.Map.bank_id == current_user.bank_id).all()
    
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
    if recent_circular and recent_circular.department_summary:
        for dept, stats in recent_circular.department_summary.items():
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
    circulars = db.query(models.Circular).filter(models.Circular.bank_id == current_user.bank_id).all()
    return [
        {
            "id": str(c.id),
            "refNumber": c.ref_number,
            "title": c.title,
            "category": c.category or "General",
            "publishedDate": str(c.published_date),
            "detectedDate": str(c.created_at),
            "totalObligations": c.total_obligations,
            "completedObligations": c.completed_obligations,
            "status": c.status if c.status in ['pending_review', 'in_progress', 'completed', 'overdue'] else 'pending_review',
            "arcaConfidence": 95, # Mock confidence
            "priority": c.priority
        } for c in circulars
    ]

@app.get("/api/maps")
def get_maps(
    circular_id: str = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Map).filter(models.Map.bank_id == current_user.bank_id)
    if circular_id:
        query = query.filter(models.Map.circular_id == circular_id)
        
    if current_user.role in ['department_user', 'department_head']:
        user_dept = db.query(models.Department).filter(models.Department.id == current_user.department_id).first()
        if user_dept:
            query = query.filter(models.Map.department_raw.ilike(f"%{user_dept.name}%"))
        else:
            # If a department user has no department assigned, show them no tasks instead of all
            query = query.filter(models.Map.id == None)
            
    maps = query.all()
    
    return [
        {
            "id": str(m.id),
            "mapId": m.map_ref,
            "circularId": str(m.circular_id),
            "action": m.obligation_text,
            "department": m.department_raw,
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
    db_map = db.query(models.Map).filter(models.Map.id == map_id).first()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
        
    update_data = map_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_map, key, value)
        
    db.commit()
    db.refresh(db_map)
    return {"message": "Map updated successfully", "status": db_map.status}

@app.post("/api/maps/{map_id}/evidence")
def upload_evidence(
    map_id: str,
    evidence: schemas.EvidenceUpload,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    db_map = db.query(models.Map).filter(models.Map.id == map_id).first()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
        
    # Create Evidence
    db_evidence = models.Evidence(
        map_id=db_map.id,
        submitted_by=current_user.id,
        file_name=evidence.file_name,
        notes=evidence.notes
    )
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    
    # Update map status
    db_map.status = "under_review"
    db.commit()
    
    # Mock LLM Validation Agent response
    # Realistically this would be queued via Celery, but we mock it inline here
    import random
    verdicts = ["Satisfied", "Partial", "Insufficient"]
    reasons = [
        "All requirements met clearly.",
        "Missing clear definition of hardware token scope.",
        "Document provided is unrelated to the policy requirement."
    ]
    mock_idx = random.randint(0, 2)
    
    db_validation = models.ValidationVerdict(
        evidence_id=db_evidence.id,
        verdict=verdicts[mock_idx],
        confidence=random.randint(70, 99),
        reasoning=reasons[mock_idx],
        missing_elements=[] if mock_idx == 0 else ["Clear scope definition", "Sign-off from board"]
    )
    db.add(db_validation)
    db.commit()
    
    return {"message": "Evidence submitted successfully"}

@app.get("/api/validations")
def get_validations(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    # Fetch MAPs that are 'under_review'
    maps_under_review = db.query(models.Map).filter(models.Map.status == "under_review").all()
    results = []
    
    for m in maps_under_review:
        evidence = db.query(models.Evidence).filter(models.Evidence.map_id == m.id).order_by(models.Evidence.submitted_at.desc()).first()
        if evidence:
            verdict = db.query(models.ValidationVerdict).filter(models.ValidationVerdict.evidence_id == evidence.id).order_by(models.ValidationVerdict.created_at.desc()).first()
            if verdict:
                circ = m.circular
                results.append({
                    "id": str(verdict.id),
                    "mapId": m.map_ref,
                    "circularRef": circ.ref_number if circ else "",
                    "mapAction": m.obligation_text,
                    "department": m.department_raw,
                    "evidenceFile": evidence.file_name,
                    "evidenceNotes": evidence.notes,
                    "verdict": verdict.verdict,
                    "confidence": verdict.confidence,
                    "reasoning": verdict.reasoning,
                    "missingElements": verdict.missing_elements,
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
    verdict = db.query(models.ValidationVerdict).filter(models.ValidationVerdict.id == validation_id).first()
    if not verdict:
        raise HTTPException(status_code=404, detail="Validation not found")
        
    evidence = db.query(models.Evidence).filter(models.Evidence.id == verdict.evidence_id).first()
    db_map = db.query(models.Map).filter(models.Map.id == evidence.map_id).first()
    
    if decision.action == "Confirm Close":
        db_map.status = "closed"
    elif decision.action == "Override":
        db_map.status = "closed" # Overridden to closed
    elif decision.action == "Request Resubmission":
        db_map.status = "rework_required"
        
    db.commit()
    return {"message": f"Action {decision.action} recorded"}

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)