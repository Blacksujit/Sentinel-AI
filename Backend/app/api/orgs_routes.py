from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import uuid4
import re
from sqlalchemy.exc import IntegrityError

from app.auth.dependencies import require_authenticated_user, get_db
from app.tenancy.org_context import resolve_org, resolve_org_from_request, require_org_membership
from app.rbac.enforce import require_permission, require_permission_from_path
from app.services.audit_service import AuditService
from app.services.usage_service import UsageService
from app.services.workspace_service import WorkspaceService
from app.storage.org_models import Organization, OrgMembership
from app.storage.user_models import User
from app.storage.rbac_models import RbacRole
from app.storage.models import RiskLog
from app.api.schemas import RiskLogResponse
import json

router = APIRouter()


def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "org"


def _ensure_unique_org_slug(db: Session, base_slug: str) -> str:
    base = _slugify(base_slug)
    slug = base
    i = 2
    while db.query(Organization).filter(Organization.slug == slug).first() is not None:
        slug = f"{base}-{i}"
        i += 1
    return slug

# Pydantic models
class OrgCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    email: Optional[str] = None  # Company email for domain verification

class OrgResponse(BaseModel):
    id: int
    clerk_org_id: str
    name: str
    slug: str
    owner_user_id: int
    plan_tier: str
    created_at: datetime

class MembershipResponse(BaseModel):
    user_id: int
    org_id: int
    clerk_org_id: str
    org_name: str
    role: str
    joined_at: datetime

class UserMeResponse(BaseModel):
    id: int
    clerk_user_id: str
    email: str
    name: Optional[str]
    onboarding_completed: bool
    memberships: List[MembershipResponse]

@router.get("/me", response_model=UserMeResponse)
async def get_me(
    request: Request,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Return current SentinelAI user with memberships and permissions."""
    from app.storage.org_models import OrgMembership
    from app.rbac.permissions import user_permissions_for_org

    memberships = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user.id)
        .all()
    )
    membership_responses = []
    for m in memberships:
        role_name = db.query(RbacRole).filter(RbacRole.id == m.role_id).first()
        org = db.query(Organization).filter(Organization.id == m.org_id).first()
        membership_responses.append(
            MembershipResponse(
                user_id=m.user_id,
                org_id=m.org_id,
                clerk_org_id=org.clerk_org_id if org else "",
                org_name=org.name if org else f"Organization {m.org_id}",
                role=role_name.name if role_name else "unknown",
                joined_at=m.joined_at,
            )
        )
    return UserMeResponse(
        id=user.id,
        clerk_user_id=user.clerk_user_id,
        email=user.email,
        name=user.name,
        onboarding_completed=bool(getattr(user, "onboarding_completed", False)),
        memberships=membership_responses,
    )

@router.post("/orgs", response_model=OrgResponse)
async def create_org(
    payload: OrgCreate,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    requested_slug = payload.slug or payload.name
    unique_slug = _ensure_unique_org_slug(db, requested_slug)

    org = Organization(
        clerk_org_id=str(uuid4()),
        name=payload.name,
        slug=unique_slug,
        company_email=payload.email,  # Save company email
        owner_user_id=user.id,
    )
    db.add(org)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Organization slug already exists")

    # Ensure the creator is a member (OWNER) so org-scoped access works immediately.
    owner_role = (
        db.query(RbacRole)
        .filter(RbacRole.name == "OWNER", RbacRole.org_id.is_(None))
        .first()
    )
    if not owner_role:
        raise HTTPException(status_code=500, detail="Default OWNER role is not seeded")

    db.add(
        OrgMembership(
            user_id=user.id,
            org_id=org.id,
            role_id=owner_role.id,
        )
    )
    
    # Create a default workspace for the organization
    from app.storage.workspace_models import WorkspaceRole
    default_workspace = WorkspaceService.create_workspace(
        db=db,
        org_id=org.id,
        name="Default Workspace",
        created_by_user_id=user.id
    )
    default_workspace.is_default = True
    
    # Create default roles for the workspace
    WorkspaceService.create_default_workspace_roles(db, default_workspace.id)
    
    # Get the OWNER role for the workspace
    workspace_owner_role = db.query(WorkspaceRole).filter(
        WorkspaceRole.workspace_id == default_workspace.id,
        WorkspaceRole.name == "OWNER"
    ).first()
    
    if workspace_owner_role:
        # Add the creator as a workspace member with OWNER role
        WorkspaceService.add_workspace_member(
            db=db,
            workspace_id=default_workspace.id,
            user_id=user.id,
            role_id=workspace_owner_role.id
        )
    
    AuditService.log(
        db,
        org_id=org.id,
        actor_user_id=user.id,
        actor_type="user",
        action="org.created",
        target_type="organization",
        target_id=org.id,
    )
    db.commit()
    return OrgResponse(
        id=org.id,
        clerk_org_id=org.clerk_org_id,
        name=org.name,
        slug=org.slug,
        owner_user_id=org.owner_user_id,
        plan_tier=org.plan_tier.value,
        created_at=org.created_at,
    )

@router.get("/orgs", response_model=List[OrgResponse])
async def list_orgs(
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """List organizations where the user is a member."""
    org_ids = (
        db.query(OrgMembership.org_id)
        .filter(OrgMembership.user_id == user.id)
        .subquery()
    )
    orgs = db.query(Organization).filter(Organization.id.in_(org_ids)).all()
    return [
        OrgResponse(
            id=o.id,
            clerk_org_id=o.clerk_org_id,
            name=o.name,
            slug=o.slug,
            owner_user_id=o.owner_user_id,
            plan_tier=o.plan_tier.value,
            created_at=o.created_at,
        )
        for o in orgs
    ]


@router.get("/orgs/{org_id}/risk-logs", response_model=List[RiskLogResponse])
async def get_org_risk_logs(
    org_id: str,
    limit: int = 50,
    workspace_id: Optional[int] = None,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)

    query = db.query(RiskLog).filter(RiskLog.org_id == org.id)
    if workspace_id is not None:
        query = query.filter(RiskLog.workspace_id == workspace_id)

    logs = query.order_by(RiskLog.created_at.desc()).limit(limit).all()

    return [
        RiskLogResponse(
            id=log.id,
            created_at=log.created_at,
            final_risk_score=log.final_risk_score,
            prompt=log.prompt,
            response=log.response,
            flags=json.loads(log.flags) if log.flags else [],
            signals=json.loads(log.signals) if getattr(log, "signals", None) else None,
            confidence=log.confidence,
            decision=log.decision,
            action_taken=log.decision,
            decision_reason=log.decision_reason,
            settings_version=getattr(log, "settings_version", None),
            thresholds_applied=(
                json.loads(getattr(log, "thresholds_applied", None))
                if getattr(log, "thresholds_applied", None)
                else None
            ),
            source=getattr(log, "source", None),
            client_metadata=getattr(log, "client_metadata", None),
            user_id=getattr(log, "user_id", None),
            session_id=getattr(log, "session_id", None),
            org_id=getattr(log, "org_id", None),
            workspace_id=getattr(log, "workspace_id", None),
        )
        for log in logs
    ]

@router.get("/orgs/{org_id}", response_model=OrgResponse)
async def get_org(
    org_id: str,
    _: None = require_permission_from_path("org.manage"),
    db: Session = Depends(get_db),
):
    org = resolve_org(db, org_id)
    return OrgResponse(
        id=org.id,
        clerk_org_id=org.clerk_org_id,
        name=org.name,
        slug=org.slug,
        owner_user_id=org.owner_user_id,
        plan_tier=org.plan_tier.value,
        created_at=org.created_at,
    )


@router.get("/orgs/{org_id}/logs")
async def get_org_logs(
    org_id: str,
    limit: int = 50,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get organization usage logs."""
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    
    logs = UsageService.get_org_logs(db, org.id, limit=limit)
    return [
        {
            "id": log.id,
            "endpoint": log.endpoint,
            "timestamp": log.timestamp.isoformat(),
            "risk_score": log.risk_score,
            "success": log.success,
            "action_taken": log.action_taken,
            "latency_ms": log.latency_ms
        }
        for log in logs
    ]


@router.get("/orgs/{org_id}/baselines")
async def get_org_baselines(
    org_id: str,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Get organization baseline configuration."""
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    
    # Return default baselines for now
    return {
        "risk_threshold_low": 30.0,
        "risk_threshold_medium": 60.0,
        "risk_threshold_high": 85.0,
        "risk_threshold_critical": 95.0,
        "model_sensitivity": "medium",
        "alert_on_block": True,
        "alert_on_high_risk": True,
        "alert_on_critical": True
    }


@router.post("/orgs/{org_id}/baselines")
async def update_org_baselines(
    org_id: str,
    config: dict,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Update organization baseline configuration."""
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    
    # Update baseline config in organization
    org.baseline_config = config
    db.commit()
    
    AuditService.log(
        db,
        org_id=org.id,
        actor_user_id=user.id,
        actor_type="user",
        action="baseline.updated",
        target_type="organization",
        target_id=org.id,
    )
    
    return config
