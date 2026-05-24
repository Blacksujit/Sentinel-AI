"""Workspace routes for managing workspaces and their members."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from app.auth.dependencies import require_authenticated_user, get_db
from app.services.workspace_service import WorkspaceService
from app.storage.workspace_models import Workspace, WorkspaceMember, WorkspaceInvite, WorkspaceRole
from app.storage.user_models import User
from app.storage.org_models import OrgMembership
from app.storage.rbac_models import RbacRole
from app.storage.models import RiskLog


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
    updated_at: Optional[datetime]


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


@router.post("", response_model=WorkspaceResponse)
async def create_workspace(
    workspace_data: WorkspaceCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Create a new workspace for the user's organization."""
    # Get user's organizations
    org_ids = [row.org_id for row in db.query(OrgMembership.org_id).filter(OrgMembership.user_id == user.id).all()]
    if not org_ids:
        raise HTTPException(status_code=400, detail="User must be a member of an organization to create a workspace")

    # Use the first organization (could be enhanced to let user choose)
    org_id = org_ids[0]

    # Create workspace
    workspace = WorkspaceService.create_workspace(
        db=db,
        org_id=org_id,
        name=workspace_data.name,
        created_by_user_id=user.id
    )

    # Create default roles for the workspace
    WorkspaceService.create_default_workspace_roles(db, workspace.id)

    # Get the OWNER role for the workspace
    owner_role = db.query(WorkspaceRole).filter(
        WorkspaceRole.workspace_id == workspace.id,
        WorkspaceRole.name == "OWNER"
    ).first()

    if owner_role:
        # Add the creator as a workspace member with OWNER role
        WorkspaceService.add_workspace_member(
            db=db,
            workspace_id=workspace.id,
            user_id=user.id,
            role_id=owner_role.id
        )

    # Get member count
    member_count = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace.id,
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


@router.post("/migrate-default-workspaces")
async def migrate_default_workspaces(
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Create default workspaces for organizations that don't have any (admin only)."""
    from app.storage.org_models import Organization

    # Get all organizations
    orgs = db.query(Organization).all()
    results = []

    for org in orgs:
        # Check if org already has workspaces
        existing_workspaces = db.query(Workspace).filter(Workspace.org_id == org.id).all()

        if existing_workspaces:
            results.append({"org_id": org.id, "org_name": org.name, "status": "skipped", "reason": "already has workspaces"})
            continue

        # Create default workspace
        workspace = WorkspaceService.create_workspace(
            db=db,
            org_id=org.id,
            name="Default Workspace",
            created_by_user_id=org.owner_user_id
        )
        workspace.is_default = True

        # Create default roles for the workspace
        WorkspaceService.create_default_workspace_roles(db, workspace.id)

        # Get the OWNER role for the workspace
        workspace_owner_role = db.query(WorkspaceRole).filter(
            WorkspaceRole.workspace_id == workspace.id,
            WorkspaceRole.name == "OWNER"
        ).first()

        if workspace_owner_role:
            # Add the owner as a workspace member with OWNER role
            WorkspaceService.add_workspace_member(
                db=db,
                workspace_id=workspace.id,
                user_id=org.owner_user_id,
                role_id=workspace_owner_role.id
            )
            results.append({"org_id": org.id, "org_name": org.name, "status": "created", "workspace_id": workspace.id})
        else:
            results.append({"org_id": org.id, "org_name": org.name, "status": "failed", "reason": "could not create owner role"})

    db.commit()
    return {"migrated": len([r for r in results if r["status"] == "created"]), "results": results}


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


class WorkspaceStatsResponse(BaseModel):
    total_events_7d: int
    critical_alerts_7d: int
    avg_risk_score_7d: float
    events_today: int
    member_count: int
    change_vs_last_week: Optional[float] = None


class RiskEventItem(BaseModel):
    id: int
    risk_score: float
    flags: str
    decision: str
    category: str
    description: str
    detected_at: datetime
    source: Optional[str] = None


@router.get("/{workspace_id}/stats", response_model=WorkspaceStatsResponse)
async def get_workspace_stats(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Get aggregated statistics for a workspace."""
    # Verify workspace access
    workspace = WorkspaceService.get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
        WorkspaceMember.is_active == True
    ).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    two_weeks_ago = datetime.utcnow() - timedelta(days=14)

    # Events in last 7 days
    events_7d = db.query(RiskLog).filter(
        RiskLog.workspace_id == workspace_id,
        RiskLog.created_at >= seven_days_ago
    ).all()

    # Events today
    events_today = sum(1 for e in events_7d if e.created_at >= today_start)

    # Critical alerts (risk_score >= 0.8)
    critical_alerts = sum(1 for e in events_7d if e.final_risk_score >= 0.8)

    # Average risk score
    avg_risk = 0.0
    if events_7d:
        avg_risk = round(sum(e.final_risk_score for e in events_7d) / len(events_7d), 4)

    # Member count
    member_count = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.is_active == True
    ).count()

    # Compare with previous week
    events_previous_week = db.query(RiskLog).filter(
        RiskLog.workspace_id == workspace_id,
        RiskLog.created_at >= two_weeks_ago,
        RiskLog.created_at < seven_days_ago
    ).count()

    change_vs_last_week = None
    if events_previous_week > 0:
        change_vs_last_week = round(
            ((len(events_7d) - events_previous_week) / events_previous_week) * 100, 1
        )

    return WorkspaceStatsResponse(
        total_events_7d=len(events_7d),
        critical_alerts_7d=critical_alerts,
        avg_risk_score_7d=avg_risk,
        events_today=events_today,
        member_count=member_count,
        change_vs_last_week=change_vs_last_week,
    )


@router.get("/{workspace_id}/events", response_model=List[RiskEventItem])
async def get_workspace_events(
    workspace_id: int,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Get recent risk events for a workspace."""
    # Verify workspace access
    workspace = WorkspaceService.get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
        WorkspaceMember.is_active == True
    ).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")

    events = (
        db.query(RiskLog)
        .filter(RiskLog.workspace_id == workspace_id)
        .order_by(RiskLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        RiskEventItem(
            id=e.id,
            risk_score=e.final_risk_score,
            flags=e.flags or "[]",
            decision=e.decision or "unknown",
            category=_extract_category(e.flags),
            description=_extract_description(e),
            detected_at=e.created_at,
            source=e.source,
        )
        for e in events
    ]


def _extract_category(flags_json: Optional[str]) -> str:
    """Extract primary category from flags JSON."""
    if not flags_json:
        return "unknown"
    try:
        flags = json.loads(flags_json)
        if flags and len(flags) > 0:
            return flags[0].replace("_", " ").title()
        return "unknown"
    except (json.JSONDecodeError, IndexError):
        return "unknown"


def _extract_description(log: RiskLog) -> str:
    """Build a readable description from a risk log entry."""
    if log.decision_reason and log.decision_reason != "No reason provided":
        return log.decision_reason
    try:
        flags = json.loads(log.flags) if log.flags else []
        if flags:
            return f"Detected: {', '.join(flags[:2])}"
    except (json.JSONDecodeError, TypeError):
        pass
    return "Risk event detected"


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
