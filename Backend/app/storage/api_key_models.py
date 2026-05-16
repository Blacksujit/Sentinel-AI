import enum

from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .db import Base


class ApiKeyStatus(str, enum.Enum):
    ACTIVE = "active"
    REVOKED = "revoked"

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    prefix = Column(String(8), nullable=False, index=True)  # First 8 chars for display
    key_hash = Column(String(255), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default=ApiKeyStatus.ACTIVE.value, index=True)
    
    # Usage tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    usage_count_24h = Column(Integer, default=0)  # Cached counter
    usage_count_30d = Column(Integer, default=0)   # Cached counter
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Scoped permissions (MVP: all permissions)
    permissions = Column(JSON, default=list)  # ["read", "write", "admin"]

    # Relationships
    organization = relationship("Organization", back_populates="api_keys")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    revoked_by_user = relationship("User", foreign_keys=[revoked_by_user_id])
