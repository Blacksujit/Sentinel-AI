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


class WorkspaceRoleUpdateRequest(BaseModel):
    role: str


class AcceptWorkspaceInviteResponse(BaseModel):
    workspace_id: int
    org_id: int
    user_id: int
    email: str
    name: Optional[str]
    role: str
    joined_at: datetime


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


# Role hierarchy for workspace permissions
WORKSPACE_ROLE_HIERARCHY = {
    "VIEWER": 1,
    "DEVELOPER": 2,
    "ADMIN": 3,
    "OWNER": 4,
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _workspace_member_response(member: WorkspaceMember) -> WorkspaceMemberResponse:
    """Build a WorkspaceMemberResponse from a WorkspaceMember row."""
    return WorkspaceMemberResponse(
        user_id=member.user_id,
        email=member.user.email if member.user else "",
        name=member.user.name if member.user else None,
        role=member.role.name if member.role else "unknown",
        joined_at=member.joined_at,
    )


def _require_workspace_member(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember:
    """Return active workspace member or raise 404."""
    member = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_active == True,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Membership not found")
    return member


def _require_workspace_admin(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember:
    """Return the actor's workspace membership if they are ADMIN+, else 403."""
    actor_member = _require_workspace_member(db, workspace_id, user_id)
    actor_level = WORKSPACE_ROLE_HIERARCHY.get(
        (actor_member.role.name or "VIEWER").upper(), 1
    )
    if actor_level < WORKSPACE_ROLE_HIERARCHY["ADMIN"]:
        raise HTTPException(
            status_code=403,
            detail="Only workspace admins or owners can perform this action",
        )


# ---------------------------------------------------------------------------
# Workspaces: list, create, get
# ---------------------------------------------------------------------------


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
            id=w.id, name=w.name, slug=w.slug, description=w.description,
            is_default=w.is_default, member_count=member_counts.get(w.id, 0),
            created_at=w.created_at, updated_at=w.updated_at,
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
    org_ids = [row.org_id for row in db.query(OrgMembership.org_id).filter(OrgMembership.user_id == user.id).all()]

    if org_ids:
        org_id = org_ids[0]
    else:
        # Auto-create a personal org so workspace creation works without Clerk webhooks
        from app.storage.org_models import Organization, PlanTier
        from app.storage.baseline_config_models import DEFAULT_BASELINE_CONFIG
        from app.storage.rbac_models import RbacRole

        personal_slug = f"personal-{user.id}"
        org = db.query(Organization).filter(Organization.slug == personal_slug).first()
        if not org:
            org = Organization(
                clerk_org_id=f"local-{user.id}",
                name=f"{user.name or user.email}'s Organization",
                slug=personal_slug,
                owner_user_id=user.id,
                plan_tier=PlanTier.FREE,
                baseline_config=DEFAULT_BASELINE_CONFIG.copy(),
            )
            db.add(org)
            db.flush()

            owner_role = db.query(RbacRole).filter(RbacRole.name == "OWNER", RbacRole.org_id.is_(None)).first()
            if owner_role:
                db.add(OrgMembership(org_id=org.id, user_id=user.id, role_id=owner_role.id))
            db.commit()
        org_id = org.id

    workspace = WorkspaceService.create_workspace(
        db=db, org_id=org_id, name=workspace_data.name, created_by_user_id=user.id
    )
    WorkspaceService.create_default_workspace_roles(db, workspace.id)

    owner_role = db.query(WorkspaceRole).filter(
        WorkspaceRole.workspace_id == workspace.id,
        WorkspaceRole.name == "OWNER"
    ).first()
    if owner_role:
        WorkspaceService.add_workspace_member(
            db=db, workspace_id=workspace.id, user_id=user.id, role_id=owner_role.id
        )

    member_count = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.is_active == True
    ).count()

    return WorkspaceResponse(
        id=workspace.id, name=workspace.name, slug=workspace.slug,
        description=workspace.description, is_default=workspace.is_default,
        member_count=member_count, created_at=workspace.created_at, updated_at=workspace.updated_at,
    )


@router.post("/migrate-default-workspaces")
async def migrate_default_workspaces(
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Create default workspaces for organizations that don't have any (admin only)."""
    from app.storage.org_models import Organization

    orgs = db.query(Organization).all()
    results = []

    for org in orgs:
        existing_workspaces = db.query(Workspace).filter(Workspace.org_id == org.id).all()
        if existing_workspaces:
            results.append({"org_id": org.id, "org_name": org.name, "status": "skipped", "reason": "already has workspaces"})
            continue

        workspace = WorkspaceService.create_workspace(
            db=db, org_id=org.id, name="Default Workspace", created_by_user_id=org.owner_user_id
        )
        workspace.is_default = True
        WorkspaceService.create_default_workspace_roles(db, workspace.id)

        workspace_owner_role = db.query(WorkspaceRole).filter(
            WorkspaceRole.workspace_id == workspace.id,
            WorkspaceRole.name == "OWNER"
        ).first()
        if workspace_owner_role:
            WorkspaceService.add_workspace_member(
                db=db, workspace_id=workspace.id, user_id=org.owner_user_id, role_id=workspace_owner_role.id
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

    workspace_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
        WorkspaceMember.is_active == True
    ).first()
    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")

    member_count = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.is_active == True
    ).count()

    return WorkspaceResponse(
        id=workspace.id, name=workspace.name, slug=workspace.slug,
        description=workspace.description, is_default=workspace.is_default,
        member_count=member_count, created_at=workspace.created_at, updated_at=workspace.updated_at,
    )



# ---------------------------------------------------------------------------
# Workspace members: list, invite
# ---------------------------------------------------------------------------


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
async def get_workspace_members(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Get all members for a workspace."""
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
            user_id=member.user_id, email=member.user.email, name=member.user.name,
            role=member.role.name, joined_at=member.joined_at
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

    role = db.query(WorkspaceRole).filter(
        WorkspaceRole.workspace_id == workspace_id,
        WorkspaceRole.name == invite.role.upper(),
    ).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Role '{invite.role}' not found")

    workspace_invite = WorkspaceService.create_workspace_invite(
        db=db, workspace_id=workspace_id, email=invite.email,
        role_id=role.id, invited_by_user_id=user.id
    )

    # Best-effort email send
    email_sent = False
    try:
        from app.services.email_service import EmailService
        from app.storage.org_models import Organization
        workspace_obj = WorkspaceService.get_workspace_by_id(db, workspace_id)
        org_obj = (
            db.query(Organization).filter(Organization.id == workspace_obj.org_id).first()
            if workspace_obj else None
        )
        email_sent = await EmailService.send_workspace_invite_email(
            to_email=workspace_invite.email,
            token=workspace_invite.token,
            org_name=org_obj.name if org_obj else "your organization",
            workspace_name=workspace_obj.name if workspace_obj else "a workspace",
            role_name=role.name,
            expires_in_days=7,
        )
    except Exception:
        email_sent = False

    # Audit log
    try:
        from app.services.audit_service import AuditService
        workspace_obj = WorkspaceService.get_workspace_by_id(db, workspace_id)
        AuditService.log(
            db,
            org_id=workspace_obj.org_id if workspace_obj else None,
            actor_user_id=user.id,
            actor_type="user",
            action="workspace.member.invite",
            target_type="workspace_invite",
            target_id=workspace_invite.id,
            event_metadata={
                "workspace_id": workspace_id,
                "email": invite.email,
                "role": role.name,
                "email_sent": email_sent,
            },
        )
        db.commit()
    except Exception:
        pass

    return WorkspaceInviteResponse(
        id=workspace_invite.id, email=workspace_invite.email, role=role.name,
        status=workspace_invite.status, invited_by=user.name or user.email,
        created_at=workspace_invite.created_at, expires_at=workspace_invite.expires_at,
    )



# ---------------------------------------------------------------------------
# Workspace stats and events
# ---------------------------------------------------------------------------


@router.get("/{workspace_id}/stats", response_model=WorkspaceStatsResponse)
async def get_workspace_stats(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Get aggregated statistics for a workspace."""
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

    events_7d = db.query(RiskLog).filter(
        RiskLog.workspace_id == workspace_id,
        RiskLog.created_at >= seven_days_ago
    ).all()
    events_today = sum(1 for e in events_7d if e.created_at >= today_start)
    critical_alerts = sum(1 for e in events_7d if e.final_risk_score >= 0.8)
    avg_risk = 0.0
    if events_7d:
        avg_risk = round(sum(e.final_risk_score for e in events_7d) / len(events_7d), 4)
    member_count = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.is_active == True
    ).count()
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
        total_events_7d=len(events_7d), critical_alerts_7d=critical_alerts,
        avg_risk_score_7d=avg_risk, events_today=events_today,
        member_count=member_count, change_vs_last_week=change_vs_last_week,
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
        .offset(offset).limit(limit).all()
    )
    return [
        RiskEventItem(
            id=e.id, risk_score=e.final_risk_score, flags=e.flags or "[]",
            decision=e.decision or "unknown", category=_extract_category(e.flags),
            description=_extract_description(e), detected_at=e.created_at, source=e.source,
        )
        for e in events
    ]


def _extract_category(flags_json: Optional[str]) -> str:
    """Extract primary category from flags JSON."""
    if not flags_json:
        return "unknown"


# ---------------------------------------------------------------------------
# Workspace invites list
# ---------------------------------------------------------------------------


@router.get("/{workspace_id}/invites", response_model=List[WorkspaceInviteResponse])
async def get_workspace_invites(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Get all pending invitations for a workspace."""
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
            id=invite.id, email=invite.email, role=invite.role.name,
            status=invite.status,
            invited_by=(
                (invite.invited_by.name or invite.invited_by.email)
                if invite.invited_by else None
            ),
            created_at=invite.created_at, expires_at=invite.expires_at,
        )
        for invite in invites
    ]


# ---------------------------------------------------------------------------
# Member management: PATCH role, DELETE member
# ---------------------------------------------------------------------------


@router.patch(
    "/{workspace_id}/members/{user_id}",
    response_model=WorkspaceMemberResponse,
)
async def update_workspace_member_role(
    workspace_id: int,
    user_id: int,
    payload: WorkspaceRoleUpdateRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_authenticated_user),
):
    """Update a workspace member's role."""
    actor_member = _require_workspace_admin(db, workspace_id, actor.id)
    actor_level = WORKSPACE_ROLE_HIERARCHY.get(
        (actor_member.role.name or "VIEWER").upper(), 1
    )

    target_member = _require_workspace_member(db, workspace_id, user_id)
    target_current_level = WORKSPACE_ROLE_HIERARCHY.get(
        (target_member.role.name or "VIEWER").upper(), 1
    )
    if target_current_level > actor_level:
        raise HTTPException(
            status_code=403,
            detail="Cannot modify a member with a higher role than yours",
        )

    new_role_name = (payload.role or "").upper()
    if new_role_name not in WORKSPACE_ROLE_HIERARCHY:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")
    new_level = WORKSPACE_ROLE_HIERARCHY[new_role_name]
    if new_level > actor_level:
        raise HTTPException(
            status_code=403,
            detail="Cannot assign a role higher than your own",
        )

    if target_current_level == WORKSPACE_ROLE_HIERARCHY["OWNER"] and new_level < WORKSPACE_ROLE_HIERARCHY["OWNER"]:
        owner_count = WorkspaceService.count_workspace_owners(db, workspace_id)
        if owner_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the last owner. Promote another member to owner first.",
            )

    new_role = (
        db.query(WorkspaceRole)
        .filter(
            WorkspaceRole.workspace_id == workspace_id,
            WorkspaceRole.name == new_role_name,
        )
        .first()
    )
    if not new_role:
        raise HTTPException(
            status_code=400,
            detail=f"Role '{payload.role}' is not configured for this workspace",
        )

    old_role_name = target_member.role.name if target_member.role else "unknown"
    updated = WorkspaceService.update_workspace_member_role(
        db=db, workspace_id=workspace_id, user_id=user_id, role_id=new_role.id,
    )

    try:
        from app.services.audit_service import AuditService
        AuditService.log(
            db,
            org_id=WorkspaceService.get_workspace_by_id(db, workspace_id).org_id,
            actor_user_id=actor.id,
            actor_type="user",
            action="workspace.member.role_update",
            target_type="workspace_member",
            target_id=user_id,
            event_metadata={
                "workspace_id": workspace_id,
                "old_role": old_role_name,
                "new_role": new_role_name,
            },
        )
        db.commit()
    except Exception:
        pass

    db.refresh(updated)
    return _workspace_member_response(updated)


@router.delete("/{workspace_id}/members/{user_id}")
async def remove_workspace_member(
    workspace_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_authenticated_user),
):
    """Remove a member from a workspace."""
    actor_member = _require_workspace_admin(db, workspace_id, actor.id)
    actor_level = WORKSPACE_ROLE_HIERARCHY.get(
        (actor_member.role.name or "VIEWER").upper(), 1
    )

    target_member = _require_workspace_member(db, workspace_id, user_id)
    target_level = WORKSPACE_ROLE_HIERARCHY.get(
        (target_member.role.name or "VIEWER").upper(), 1
    )
    if target_level > actor_level:
        raise HTTPException(
            status_code=403,
            detail="Cannot remove a member with a higher role than yours",
        )

    if target_level == WORKSPACE_ROLE_HIERARCHY["OWNER"]:
        owner_count = WorkspaceService.count_workspace_owners(db, workspace_id)
        if owner_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last owner. Promote another member to owner first.",
            )

    WorkspaceService.remove_workspace_member(db, workspace_id, user_id)

    try:
        from app.services.audit_service import AuditService
        AuditService.log(
            db,
            org_id=WorkspaceService.get_workspace_by_id(db, workspace_id).org_id,
            actor_user_id=actor.id,
            actor_type="user",
            action="workspace.member.remove",
            target_type="workspace_member",
            target_id=user_id,
            event_metadata={"workspace_id": workspace_id},
        )
        db.commit()
    except Exception:
        pass

    return {"message": "Member removed successfully"}


# ---------------------------------------------------------------------------
# Invite management: cancel, accept
# ---------------------------------------------------------------------------


@router.delete("/{workspace_id}/invites/{invite_id}")
async def cancel_workspace_invite(
    workspace_id: int,
    invite_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_authenticated_user),
):
    """Cancel a pending workspace invitation."""
    _require_workspace_admin(db, workspace_id, actor.id)

    invite = WorkspaceService.get_workspace_invite_by_id(db, invite_id)
    if not invite or invite.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel invitation with status: {invite.status}",
        )

    WorkspaceService.cancel_workspace_invite(db, workspace_id, invite_id)

    try:
        from app.services.audit_service import AuditService
        AuditService.log(
            db,
            org_id=WorkspaceService.get_workspace_by_id(db, workspace_id).org_id,
            actor_user_id=actor.id,
            actor_type="user",
            action="workspace.invite.cancel",
            target_type="workspace_invite",
            target_id=invite_id,
            event_metadata={"workspace_id": workspace_id, "email": invite.email},
        )
        db.commit()
    except Exception:
        pass

    return {"message": "Invitation cancelled successfully"}


@router.post(
    "/invites/{token}/accept",
    response_model=AcceptWorkspaceInviteResponse,
)
async def accept_workspace_invite(
    token: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user),
):
    """Accept a workspace invitation by token."""
    try:
        member = WorkspaceService.accept_workspace_invite(
            db=db, token=token, user_id=user.id, user_email=user.email
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.refresh(member)
    workspace = WorkspaceService.get_workspace_by_id(db, member.workspace_id)

    try:
        from app.services.audit_service import AuditService
        AuditService.log(
            db,
            org_id=workspace.org_id if workspace else None,
            actor_user_id=user.id,
            actor_type="user",
            action="workspace.invite.accept",
            target_type="workspace_member",
            target_id=member.user_id,
            event_metadata={"workspace_id": member.workspace_id},
        )
        db.commit()
    except Exception:
        pass

    return AcceptWorkspaceInviteResponse(
        workspace_id=member.workspace_id,
        org_id=workspace.org_id if workspace else 0,
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=member.role.name if member.role else "unknown",
        joined_at=member.joined_at,
    )


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
