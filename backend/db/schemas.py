from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date, datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class User(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class CircularUploadResponse(BaseModel):
    message: str
    circular_id: str
    total_maps: int

class MapUpdate(BaseModel):
    department_raw: Optional[str] = None
    deadline_raw: Optional[str] = None
    obligation_text: Optional[str] = None
    clause_ref: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class EvidenceUpload(BaseModel):
    file_name: str
    notes: Optional[str] = None

class ValidationDecision(BaseModel):
    action: str # "Confirm Close", "Override", "Request Resubmission"
    reasoning: Optional[str] = None

class Notification(BaseModel):
    id: UUID
    bank_id: UUID
    business_vertical: Optional[str] = None
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
