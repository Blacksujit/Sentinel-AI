"""Workspace routes for managing workspaces and their members."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.auth.dependencies import require_authenticated_user, get_db
from app.services.workspace_service import WorkspaceService
from app.storage.workspace_models import Workspace, WorkspaceMember, WorkspaceInvite, WorkspaceRole
from app.storage.user_models import User
from app.storage.org_models import OrgMembership
from app.storage.rbac_models import RbacRole


router = APIRouter(prefix="/workspaces", tags=["workspaces"])


# Pydantic models
class WorkspaceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class WorkspaceInviteRequest(BaseModel):
    email: EmailStr
    role: str


class WorkspaceMemberResponse(BaseModel):
    user_id: int
    email: str
    name: Optional[str]
    role: str
    joined_at: datetime


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    is_default: bool
    member_count: int
    created_at: datetime
    updated_at: datetime


class WorkspaceInviteResponse(BaseModel):
    id: int
    email: str
    role: str
    status: str
    invited_by: str
    created_at: datetime
    expires_at: datetime


# Role hierarchy for workspace permissions
WORKSPACE_ROLE_HIERARCHY = {
    "VIEWER": 1,
    "DEVELOPER": 2,
    "ADMIN": 3,
    "OWNER": 4,
}


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """List workspaces accessible to the authenticated user."""
    org_ids = [row.org_id for row in db.query(OrgMembership.org_id).filter(OrgMembership.user_id == user.id).all()]
    if not org_ids:
        return []

    workspaces = db.query(Workspace).filter(Workspace.org_id.in_(org_ids)).all()
    member_counts = {
        wid: cnt
        for wid, cnt in (
            db.query(WorkspaceMember.workspace_id, func.count(WorkspaceMember.user_id))
            .filter(WorkspaceMember.workspace_id.in_([w.id for w in workspaces]), WorkspaceMember.is_active == True)
            .group_by(WorkspaceMember.workspace_id)
            .all()
        )
    }

    return [
        WorkspaceResponse(
            id=w.id,
            name=w.name,
            slug=w.slug,
            description=w.description,
            is_default=w.is_default,
            member_count=member_counts.get(w.id, 0),
            created_at=w.created_at,
            updated_at=w.updated_at,
        )
        for w in workspaces
    ]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
):
    """Get a specific workspace."""
    workspace = WorkspaceService.get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Check if user is a member of this workspace
    workspace_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
        WorkspaceMember.is_active == True
    ).first()
    
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")
    
    # Get member count
    member_count = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.is_active == True
    ).count()
    
    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        slug=workspace.slug,
        description=workspace.description,
        is_default=workspace.is_default,
        member_count=member_count,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
    )


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
async def get_workspace_members(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Get all members for a workspace."""
    # Check if user is a member of this workspace
    workspace_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
        WorkspaceMember.is_active == True
    ).first()
    
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")
    
    members = WorkspaceService.get_workspace_members(db, workspace_id)
    
    return [
        WorkspaceMemberResponse(
            user_id=member.user_id,
            email=member.user.email,
            name=member.user.name,
            role=member.role.name,
            joined_at=member.joined_at
        )
        for member in members
    ]


@router.post("/{workspace_id}/members/invite", response_model=WorkspaceInviteResponse)
async def invite_workspace_member(
    workspace_id: int,
    invite: WorkspaceInviteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Invite a user to join a workspace."""
    # Check if user is a member of this workspace
    workspace_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
        WorkspaceMember.is_active == True
    ).first()
    
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")

    member_role_name = (workspace_member.role.name or "VIEWER").upper()
    member_level = WORKSPACE_ROLE_HIERARCHY.get(member_role_name, 1)
    if member_level < WORKSPACE_ROLE_HIERARCHY["ADMIN"]:
        raise HTTPException(status_code=403, detail="Only workspace admins can invite members")
    
    # Get workspace role for role assignment
    role = db.query(WorkspaceRole).filter(
        WorkspaceRole.workspace_id == workspace_id,
        WorkspaceRole.name == invite.role.upper(),
    ).first()
    
    if not role:
        raise HTTPException(status_code=400, detail=f"Role '{invite.role}' not found")
    
    # Create invitation
    workspace_invite = WorkspaceService.create_workspace_invite(
        db=db,
        workspace_id=workspace_id,
        email=invite.email,
        role_id=role.id,
        invited_by_user_id=user.id
    )
    
    return WorkspaceInviteResponse(
        id=workspace_invite.id,
        email=workspace_invite.email,
        role=role.name,
        status=workspace_invite.status,
        invited_by=user.name or user.email,
        created_at=workspace_invite.created_at,
        expires_at=workspace_invite.expires_at,
    )


@router.get("/{workspace_id}/invites", response_model=List[WorkspaceInviteResponse])
async def get_workspace_invites(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Get all pending invitations for a workspace."""
    # Check if user is a member of this workspace
    workspace_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
        WorkspaceMember.is_active == True
    ).first()
    
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")

    member_role_name = (workspace_member.role.name or "VIEWER").upper()
    member_level = WORKSPACE_ROLE_HIERARCHY.get(member_role_name, 1)
    if member_level < WORKSPACE_ROLE_HIERARCHY["ADMIN"]:
        raise HTTPException(status_code=403, detail="Only workspace admins can view invites")

    invites = WorkspaceService.get_workspace_invites(db, workspace_id)
    
    return [
        WorkspaceInviteResponse(
            id=invite.id,
            email=invite.email,
            role=invite.role.name,
            status=invite.status,
            invited_by=(
                (invite.invited_by.name or invite.invited_by.email)
                if invite.invited_by
                else None
            ),
            created_at=invite.created_at,
            expires_at=invite.expires_at,
        )
        for invite in invites
    ]
