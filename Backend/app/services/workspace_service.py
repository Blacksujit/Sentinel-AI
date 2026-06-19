"""Workspace service for managing workspaces and their members."""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
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

    @staticmethod
    def get_workspace_member(db: Session, workspace_id: int, user_id: int) -> Optional[WorkspaceMember]:
        """Get a specific workspace member."""
        return (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
            .first()
        )

    @staticmethod
    def update_workspace_member_role(
        db: Session, workspace_id: int, user_id: int, role_id: int
    ) -> WorkspaceMember:
        """Update a workspace member's role."""
        member = WorkspaceService.get_workspace_member(db, workspace_id, user_id)
        if not member:
            raise ValueError(f"Member {user_id} not found in workspace {workspace_id}")
        member.role_id = role_id
        db.add(member)
        db.flush()
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def remove_workspace_member(db: Session, workspace_id: int, user_id: int) -> bool:
        """Remove a member from a workspace (hard delete)."""
        member = WorkspaceService.get_workspace_member(db, workspace_id, user_id)
        if not member:
            return False
        db.delete(member)
        db.flush()
        db.commit()
        return True

    @staticmethod
    def get_workspace_invite_by_token(db: Session, token: str) -> Optional[WorkspaceInvite]:
        """Get a workspace invite by its token."""
        return db.query(WorkspaceInvite).filter(WorkspaceInvite.token == token).first()

    @staticmethod
    def get_workspace_invite_by_id(db: Session, invite_id: int) -> Optional[WorkspaceInvite]:
        """Get a workspace invite by its id."""
        return db.query(WorkspaceInvite).filter(WorkspaceInvite.id == invite_id).first()

    @staticmethod
    def accept_workspace_invite(
        db: Session, token: str, user_id: int, user_email: str
    ) -> WorkspaceMember:
        """Accept a workspace invite and create the membership.

        Validates token, status, expiration, email match, and existing membership
        before creating the WorkspaceMember record.
        """
        invite = WorkspaceService.get_workspace_invite_by_token(db, token)
        if not invite:
            raise ValueError("Invitation not found")
        if invite.status != 'pending':
            raise ValueError(f"Invitation is {invite.status}")
        if datetime.utcnow() > invite.expires_at:
            # Auto-expire
            invite.status = 'expired'
            db.flush()
            db.commit()
            raise ValueError("Invitation has expired")
        if os.getenv("ENVIRONMENT", "production") != "development":
            if user_email.lower() != invite.email.lower():
                raise ValueError("This invitation was sent to a different email address")

        # Already a member? Gracefully accept and return existing membership.
        existing = WorkspaceService.get_workspace_member(db, invite.workspace_id, user_id)
        if existing:
            invite.status = 'accepted'
            invite.accepted_at = datetime.utcnow()
            invite.accepted_by_user_id = user_id
            db.flush()
            db.commit()
            return existing

        # Create membership
        member = WorkspaceMember(
            workspace_id=invite.workspace_id,
            user_id=user_id,
            role_id=invite.role_id,
            is_active=True,
        )
        db.add(member)

        # Mark invite accepted
        invite.status = 'accepted'
        invite.accepted_at = datetime.utcnow()
        invite.accepted_by_user_id = user_id

        db.flush()
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def cancel_workspace_invite(db: Session, workspace_id: int, invite_id: int) -> bool:
        """Cancel a pending workspace invite."""
        invite = WorkspaceService.get_workspace_invite_by_id(db, invite_id)
        if not invite or invite.workspace_id != workspace_id:
            return False
        if invite.status != 'pending':
            return False
        invite.status = 'cancelled'
        db.flush()
        db.commit()
        return True

    @staticmethod
    def count_workspace_owners(db: Session, workspace_id: int) -> int:
        """Count active workspace members with the OWNER role."""
        owner_role = (
            db.query(WorkspaceRole)
            .filter(
                WorkspaceRole.workspace_id == workspace_id,
                WorkspaceRole.name == 'OWNER',
            )
            .first()
        )
        if not owner_role:
            return 0
        return (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.role_id == owner_role.id,
            )
            .count()
        )
