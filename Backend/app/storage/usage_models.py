from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base

class UsageEvent(Base):
    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=True, index=True)
    initiator_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    endpoint = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    latency_ms = Column(Integer, nullable=True)
    risk_score = Column(Integer, nullable=True)
    success = Column(Boolean, nullable=False, default=True)
    error_code = Column(String, nullable=True)
    event_metadata = Column(JSON, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="usage_events")

    def __repr__(self):
        return f"<UsageEvent(org_id={self.org_id}, endpoint={self.endpoint})>"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    actor_type = Column(String, nullable=False, index=True)  # 'user' | 'api_key' | 'system'
    action = Column(String, nullable=False, index=True)  # e.g., 'login', 'org.created', 'member.invited', 'apikey.revoke'
    target_type = Column(String, nullable=True)
    target_id = Column(Integer, nullable=True)
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    event_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def __repr__(self):
        return f"<AuditLog(action={self.action}, actor_type={self.actor_type})>"
