from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from starlette.requests import Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from app.auth.dependencies import require_authenticated_user, get_db
from app.tenancy.org_context import require_org_membership
from app.rbac.permissions import user_permissions_for_org
from app.services.audit_service import AuditService
from app.storage.user_models import User
from app.services.api_key_service import create_api_key, list_api_keys, revoke_api_key, rotate_api_key
from app.storage.org_models import Organization

router = APIRouter()


def _resolve_org_by_identifier(db: Session, identifier: str) -> Organization:
    org = db.query(Organization).filter(Organization.clerk_org_id == identifier).first()
    if org:
        return org
    if identifier.isdigit():
        org = db.query(Organization).filter(Organization.id == int(identifier)).first()
    else:
        org = db.query(Organization).filter(Organization.slug == identifier).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


def _require_org_permission(db: Session, user_id: int, org_id: int, permission_key: str) -> None:
    perms = user_permissions_for_org(db, user_id=user_id, org_id=org_id)
    if permission_key not in perms:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {permission_key}")

# Pydantic models
class ApiKeyCreateRequest(BaseModel):
    name: str

class ApiKeyCreatedResponse(BaseModel):
    id: int
    name: str
    prefix: str
    status: str
    usage_count_24h: int
    usage_count_30d: int
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    api_key: str

class ApiKeyListItem(BaseModel):
    id: int
    name: str
    prefix: str
    status: str
    usage_count_24h: int
    usage_count_30d: int
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

@router.get("/orgs/{org_id}/api-keys", response_model=List[ApiKeyListItem])
async def list_org_api_keys(
    request: Request,
    org_id: str,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """List API keys for an organization."""
    org = _resolve_org_by_identifier(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_org_permission(db, user_id=user.id, org_id=org.id, permission_key="apikey.create")

    return list_api_keys(db, org_id=org.id)

@router.post("/orgs/{org_id}/api-keys", response_model=ApiKeyCreatedResponse)
async def create_org_api_key(
    request: Request,
    org_id: str,
    payload: ApiKeyCreateRequest,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Create an API key scoped to an organization."""
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="name is required")

    org = _resolve_org_by_identifier(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_org_permission(db, user_id=user.id, org_id=org.id, permission_key="apikey.create")

    result = create_api_key(db, org_id=org.id, created_by_user_id=user.id, name=payload.name.strip())
    db.commit()
    AuditService.log(
        db,
        org_id=org.id,
        actor_user_id=user.id,
        actor_type="user",
        action="apikey.create",
        target_type="api_key",
        target_id=result["id"],
    )
    return ApiKeyCreatedResponse(**result)

@router.post("/orgs/{org_id}/api-keys/{key_id}/revoke", response_model=ApiKeyListItem)
async def revoke_org_api_key(
    request: Request,
    org_id: str,
    key_id: int,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Revoke an API key within an organization."""
    org = _resolve_org_by_identifier(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_org_permission(db, user_id=user.id, org_id=org.id, permission_key="apikey.revoke")
    try:
        result = revoke_api_key(db, org_id=org.id, key_id=key_id)
        db.commit()
        AuditService.log(
            db,
            org_id=org.id,
            actor_user_id=user.id,
            actor_type="user",
            action="apikey.revoke",
            target_type="api_key",
            target_id=key_id,
        )
        return ApiKeyListItem(**result)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orgs/{org_id}/api-keys/{key_id}/rotate", response_model=ApiKeyCreatedResponse)
async def rotate_org_api_key(
    request: Request,
    org_id: str,
    key_id: int,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Rotate an API key within an organization. Returns the new raw key once."""
    org = _resolve_org_by_identifier(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    _require_org_permission(db, user_id=user.id, org_id=org.id, permission_key="apikey.rotate")
    try:
        result = rotate_api_key(db, org_id=org.id, key_id=key_id)
        db.commit()
        AuditService.log(
            db,
            org_id=org.id,
            actor_user_id=user.id,
            actor_type="user",
            action="apikey.rotate",
            target_type="api_key",
            target_id=key_id,
        )
        return ApiKeyCreatedResponse(**result)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
