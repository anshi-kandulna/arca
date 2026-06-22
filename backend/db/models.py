from sqlalchemy import Column, String, Boolean, DateTime, Integer, Numeric, Date, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from .database import Base

class Bank(Base):
    __tablename__ = "banks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=False)
    rbi_license_no = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class BusinessVertical(Base):
    __tablename__ = "business_verticals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_id = Column(UUID(as_uuid=True), ForeignKey("banks.id"))
    name = Column(String, nullable=False)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_id = Column(UUID(as_uuid=True), ForeignKey("banks.id"))
    email = Column(String, nullable=False, unique=True)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    business_vertical_id = Column(UUID(as_uuid=True), ForeignKey("business_verticals.id"))
    title = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Circular(Base):
    __tablename__ = "circulars"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_id = Column(UUID(as_uuid=True), ForeignKey("banks.id"))
    ref_number = Column(String, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String)
    file_path = Column(String)
    published_date = Column(Date, nullable=False)
    status = Column(String, default="detected")
    priority = Column(String, default="MEDIUM")
    total_pages = Column(Integer)
    failed_pages = Column(JSONB)
    failed_page_count = Column(Integer)
    page_summary = Column(JSONB)
    vertical_summary = Column(JSONB)
    sub_vertical_summary = Column(JSONB)
    priority_summary = Column(JSONB)
    total_obligations = Column(Integer, default=0)
    completed_obligations = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    maps = relationship("Map", back_populates="circular")

class Map(Base):
    __tablename__ = "maps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circular_id = Column(UUID(as_uuid=True), ForeignKey("circulars.id"))
    bank_id = Column(UUID(as_uuid=True), ForeignKey("banks.id"))
    map_ref = Column(String, nullable=False)
    obligation_text = Column(String, nullable=False)
    business_vertical = Column(String)
    sub_vertical = Column(String)
    routing_confidence = Column(Integer)
    deadline_raw = Column(String)
    clause_ref = Column(String)
    page_no = Column(Integer)
    matched_text = Column(String)
    bbox = Column(JSONB)
    priority = Column(String, default="MEDIUM")
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    circular = relationship("Circular", back_populates="maps")

class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    map_id = Column(UUID(as_uuid=True), ForeignKey("maps.id"))
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    file_name = Column(String)
    notes = Column(String)
    submitted_at = Column(DateTime, default=datetime.utcnow)

class ValidationVerdict(Base):
    __tablename__ = "validation_verdicts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id"))
    verdict = Column(String)
    confidence = Column(Integer)
    reasoning = Column(String)
    missing_elements = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_id = Column(UUID(as_uuid=True), ForeignKey("banks.id"))
    actor = Column(String, nullable=False)
    actor_role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    action_type = Column(String, nullable=False)
    circular_ref = Column(String)
    map_ref = Column(String)
    business_vertical = Column(String)
    details = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_id = Column(UUID(as_uuid=True), ForeignKey("banks.id"))
    business_vertical = Column(String)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
