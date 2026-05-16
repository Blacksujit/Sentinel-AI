"""Workspace models for multi-tenant organization system."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base
import enum


class Workspace(Base):
    """Workspace model for team collaboration within organizations."""
    __tablename__ = "workspaces"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, nullable=False, default=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    settings = Column(JSON, nullable=True, default=dict)
    
    # Relationships
    organization = relationship("Organization", back_populates="workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace")
    roles = relationship("WorkspaceRole", back_populates="workspace")
    invites = relationship("WorkspaceInvite", back_populates="workspace")
    
    def __repr__(self):
        return f"<Workspace(id={self.id}, name={self.name}, org_id={self.org_id})>"


class WorkspaceMember(Base):
    """Workspace member model for team collaboration."""
    __tablename__ = "workspace_members"
    
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    role_id = Column(Integer, ForeignKey("workspace_roles.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User")
    role = relationship("WorkspaceRole", back_populates="members")
    
    def __repr__(self):
        return f"<WorkspaceMember(workspace_id={self.workspace_id}, user_id={self.user_id}, role_id={self.role_id})>"


class WorkspaceRole(Base):
    """Workspace-specific role model for RBAC within workspaces."""
    __tablename__ = "workspace_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    level = Column(Integer, nullable=False)  # 1=VIEWER, 2=DEVELOPER, 3=ADMIN, 4=OWNER
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="roles")
    members = relationship("WorkspaceMember", back_populates="role")
    
    def __repr__(self):
        return f"<WorkspaceRole(id={self.id}, name={self.name}, level={self.level})>"


class WorkspaceInvite(Base):
    """Workspace-specific invitation model."""
    __tablename__ = "workspace_invites"
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("workspace_roles.id"), nullable=False)
    invited_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="invites")
    role = relationship("WorkspaceRole")
    invited_by = relationship("User", foreign_keys=[invited_by_user_id])
    accepted_by = relationship("User", foreign_keys=[accepted_by_user_id])
    
    def __repr__(self):
        return f"<WorkspaceInvite(id={self.id}, email={self.email}, workspace_id={self.workspace_id})>"
