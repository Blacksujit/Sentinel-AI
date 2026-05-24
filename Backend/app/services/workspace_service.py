"""Workspace service for managing workspaces and their members."""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import re
from sqlalchemy.orm import Session
from app.storage.workspace_models import Workspace, WorkspaceMember, WorkspaceRole, WorkspaceInvite
from app.storage.user_models import User
from app.storage.org_models import Organization


def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "workspace"


def _ensure_unique_workspace_slug(db: Session, base_slug: str) -> str:
    slug = _slugify(base_slug)
    i = 2
    while db.query(Workspace).filter(Workspace.slug == slug).first() is not None:
        slug = f"{_slugify(base_slug)}-{i}"
        i += 1
    return slug


class WorkspaceService:
    """Service for workspace operations."""
    
    @staticmethod
    def get_workspaces_for_org(db: Session, org_id: int) -> List[Workspace]:
        """Get all workspaces for an organization."""
        return db.query(Workspace).filter(Workspace.org_id == org_id).all()
    
    @staticmethod
    def get_workspace_by_id(db: Session, workspace_id: int) -> Optional[Workspace]:
        """Get a workspace by ID."""
        return db.query(Workspace).filter(Workspace.id == workspace_id).first()
    
    @staticmethod
    def get_workspace_members(db: Session, workspace_id: int) -> List[WorkspaceMember]:
        """Get all members for a workspace."""
        return db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
    
    @staticmethod
    def create_workspace(db: Session, org_id: int, name: str, created_by_user_id: int) -> Workspace:
        """Create a new workspace for an organization."""
        slug = _ensure_unique_workspace_slug(db, name)
        workspace = Workspace(
            org_id=org_id,
            name=name,
            slug=slug,
            created_by_user_id=created_by_user_id
        )
        db.add(workspace)
        db.flush()
        db.commit()
        return workspace
    
    @staticmethod
    def add_workspace_member(db: Session, workspace_id: int, user_id: int, role_id: int) -> WorkspaceMember:
        """Add a member to a workspace."""
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user_id,
            role_id=role_id,
        )
        db.add(member)
        db.flush()
        db.commit()
        return member
    
    @staticmethod
    def get_workspace_invites(db: Session, workspace_id: int) -> List[WorkspaceInvite]:
        """Get all pending invites for a workspace."""
        return db.query(WorkspaceInvite).filter(
            WorkspaceInvite.workspace_id == workspace_id,
            WorkspaceInvite.status == 'pending'
        ).all()
    
    @staticmethod
    def create_workspace_invite(db: Session, workspace_id: int, email: str, role_id: int, invited_by_user_id: int) -> WorkspaceInvite:
        """Create a workspace invitation."""
        import secrets
        import string
        
        invite = WorkspaceInvite(
            workspace_id=workspace_id,
            email=email.lower(),
            role_id=role_id,
            invited_by_user_id=invited_by_user_id,
            token=''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32)),
            status="pending",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(invite)
        db.flush()
        db.commit()
        return invite
    
    @staticmethod
    def get_workspace_roles(db: Session, workspace_id: int) -> List[WorkspaceRole]:
        """Get all roles for a workspace."""
        return db.query(WorkspaceRole).filter(WorkspaceRole.workspace_id == workspace_id).all()
    
    @staticmethod
    def create_default_workspace_roles(db: Session, workspace_id: int) -> List[WorkspaceRole]:
        """Create default roles for a workspace."""
        default_roles = [
            WorkspaceRole(workspace_id=workspace_id, name='VIEWER', level=1, description='Can view workspace content'),
            WorkspaceRole(workspace_id=workspace_id, name='DEVELOPER', level=2, description='Can access workspace tools and modify content'),
            WorkspaceRole(workspace_id=workspace_id, name='ADMIN', level=3, description='Can manage workspace members and settings'),
            WorkspaceRole(workspace_id=workspace_id, name='OWNER', level=4, description='Full control over workspace'),
        ]
        
        for role in default_roles:
            db.add(role)
        
        db.flush()
        db.commit()
        return default_roles
