"""Organization invitation models for member management."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base
import enum
import secrets
import string


class InviteStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class OrgInvite(Base):
    __tablename__ = "org_invites"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("rbac_roles.id"), nullable=False)
    invited_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(InviteStatus), nullable=False, default=InviteStatus.PENDING)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="invites")
    role = relationship("RbacRole")
    invited_by = relationship("User", foreign_keys=[invited_by_user_id])
    accepted_by = relationship("User", foreign_keys=[accepted_by_user_id])

    def __repr__(self):
        return f"<OrgInvite(id={self.id}, email={self.email}, org_id={self.org_id}, status={self.status})>"

    @staticmethod
    def generate_token():
        """Generate a secure random token for invite acceptance."""
        return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))


# Add relationship to Organization model
# This will be added dynamically after both models are loaded
# organization.invites = relationship("OrgInvite", back_populates="organization")
