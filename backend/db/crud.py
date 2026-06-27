from sqlalchemy.orm import Session
from datetime import datetime
from db import models, schemas
import uuid

# User Operations
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

# Circular Operations
def get_circular(db: Session, circular_id: str):
    return db.query(models.Circular).filter(models.Circular.id == circular_id).first()

def get_circulars_by_bank(db: Session, bank_id: str):
    return db.query(models.Circular).filter(models.Circular.bank_id == bank_id).all()

def create_circular(db: Session, bank_id: str, ref_number: str, title: str, file_path: str):
    circular = models.Circular(
        bank_id=bank_id,
        ref_number=ref_number,
        title=title,
        published_date=datetime.utcnow().date(),
        file_path=file_path,
        status="processing"
    )
    db.add(circular)
    db.commit()
    db.refresh(circular)
    return circular

def update_circular(db: Session, circular: models.Circular, data: dict):
    for key, value in data.items():
        setattr(circular, key, value)
    db.commit()
    db.refresh(circular)
    return circular

# Map Operations
def get_map(db: Session, map_id: str):
    return db.query(models.Map).filter(models.Map.id == map_id).first()

def get_map_by_ref(db: Session, bank_id: str, map_ref: str):
    return db.query(models.Map).filter(models.Map.bank_id == bank_id, models.Map.map_ref == map_ref).first()

def get_maps_by_bank(db: Session, bank_id: str, circular_id: str = None, business_vertical_name: str = None):
    query = db.query(models.Map).filter(models.Map.bank_id == bank_id)
    if circular_id:
        query = query.filter(models.Map.circular_id == circular_id)
    if business_vertical_name:
        query = query.filter(models.Map.business_vertical.ilike(f"%{business_vertical_name}%"))
    return query.all()

def get_maps_by_status(db: Session, status: str):
    return db.query(models.Map).filter(models.Map.status == status).all()

def create_map(db: Session, map_data: dict):
    db_map = models.Map(**map_data)
    db.add(db_map)
    db.commit()
    db.refresh(db_map)
    return db_map

def update_map(db: Session, db_map: models.Map, update_data: dict):
    for key, value in update_data.items():
        setattr(db_map, key, value)
    db.commit()
    db.refresh(db_map)
    return db_map

def get_business_vertical(db: Session, vertical_id: str):
    return db.query(models.BusinessVertical).filter(models.BusinessVertical.id == vertical_id).first()

# Evidence Operations
def create_evidence(db: Session, map_id: str, submitted_by: str, file_name: str, file_path: str, notes: str):
    db_evidence = models.Evidence(
        map_id=map_id,
        submitted_by=submitted_by,
        file_name=file_name,
        file_path=file_path,
        notes=notes
    )
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence

def get_latest_evidence_for_map(db: Session, map_id: str):
    return db.query(models.Evidence).filter(models.Evidence.map_id == map_id).order_by(models.Evidence.submitted_at.desc()).first()

def get_evidence(db: Session, evidence_id: str):
    return db.query(models.Evidence).filter(models.Evidence.id == evidence_id).first()

# Validation Verdict Operations
def create_validation_verdict(db: Session, evidence_id: str, verdict: str, confidence: int, reasoning: str, missing_elements: list, signal_breakdown: list = None):
    db_validation = models.ValidationVerdict(
        evidence_id=evidence_id,
        verdict=verdict,
        confidence=confidence,
        reasoning=reasoning,
        missing_elements=missing_elements,
        signal_breakdown=signal_breakdown
    )
    db.add(db_validation)
    db.commit()
    db.refresh(db_validation)
    return db_validation

def get_latest_verdict_for_evidence(db: Session, evidence_id: str):
    return db.query(models.ValidationVerdict).filter(models.ValidationVerdict.evidence_id == evidence_id).order_by(models.ValidationVerdict.created_at.desc()).first()

def get_validation_verdict(db: Session, validation_id: str):
    return db.query(models.ValidationVerdict).filter(models.ValidationVerdict.id == validation_id).first()

# Audit Log Operations
def create_audit_log(
    db: Session, 
    bank_id: str, 
    actor: str, 
    actor_role: str, 
    action: str, 
    action_type: str, 
    user_id: str = None,
    circular_ref: str = None, 
    map_ref: str = None, 
    business_vertical: str = None, 
    details: str = None
):
    db_audit = models.AuditLog(
        bank_id=bank_id,
        user_id=user_id,
        actor=actor,
        actor_role=actor_role,
        action=action,
        action_type=action_type,
        circular_ref=circular_ref,
        map_ref=map_ref,
        business_vertical=business_vertical,
        details=details
    )
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    return db_audit

def get_audit_logs(db: Session, bank_id: str, user_id: str = None):
    query = db.query(models.AuditLog).filter(models.AuditLog.bank_id == bank_id)
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    return query.order_by(models.AuditLog.created_at.desc()).all()

# Notification Operations
def create_notification(db: Session, bank_id: str, business_vertical: str, message: str):
    db_notification = models.Notification(
        bank_id=bank_id,
        business_vertical=business_vertical,
        message=message
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_recent_notifications(db: Session, bank_id: str, business_vertical: str, days: int = 3):
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    return db.query(models.Notification).filter(
        models.Notification.bank_id == bank_id,
        models.Notification.business_vertical == business_vertical,
        models.Notification.created_at >= cutoff
    ).order_by(models.Notification.created_at.desc()).all()

def mark_notification_read(db: Session, notification_id: str):
    notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if notification:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
    return notification
