from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base
import enum

class PlanTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    clerk_org_id = Column(String(255), unique=True, nullable=False, index=True)  # Clerk organization mapping
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    company_email = Column(String(255), nullable=True, index=True)  # Domain for future auth
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_tier = Column(SQLEnum(PlanTier), nullable=False, default=PlanTier.FREE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Settings (JSON for flexibility, with validation)
    baseline_config = Column(JSON, nullable=True, default=dict)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_user_id])
    memberships = relationship("OrgMembership", back_populates="organization")
    rbac_roles = relationship("RbacRole", back_populates="organization")
    api_keys = relationship("ApiKey", back_populates="organization")
    usage_events = relationship("UsageEvent", back_populates="organization")
    invites = relationship("OrgInvite", back_populates="organization")
    workspaces = relationship("Workspace", back_populates="organization")

    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name}, slug={self.slug})>"

class OrgMembership(Base):
    __tablename__ = "org_memberships"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), primary_key=True)
    role_id = Column(Integer, ForeignKey("rbac_roles.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
    organization = relationship("Organization", back_populates="memberships")
    role = relationship("RbacRole", back_populates="memberships")

    def __repr__(self):
        return f"<OrgMembership(user_id={self.user_id}, org_id={self.org_id}, role_id={self.role_id})>"
