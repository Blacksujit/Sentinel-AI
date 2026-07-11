import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.services.api_key_service import create_api_key, list_api_keys, revoke_api_key
from app.storage.org_models import Organization

router = APIRouter()


def require_admin(authorization: Optional[str] = Header(default=None)) -> None:
    admin_token = os.getenv("SENTINELAI_ADMIN_TOKEN")
    if not admin_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SENTINELAI_ADMIN_TOKEN is not configured",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin token required",
        )

    token = authorization.split(" ", 1)[1]
    if token != admin_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin token",
        )


def _resolve_org_by_slug(db: Session, slug: str) -> Organization:
    org = db.query(Organization).filter(Organization.slug == slug).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


class ApiKeyCreateRequest(BaseModel):
    name: str


class ApiKeyCreatedResponse(BaseModel):
    id: int
    name: str
    prefix: str
    active: bool
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    api_key: str


class ApiKeyListItem(BaseModel):
    id: int
    name: str
    prefix: str
    active: bool
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


@router.get("/api-keys", response_model=List[ApiKeyListItem])
async def get_api_keys(
    org_slug: str = "default",
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List API keys for an organization (legacy admin route)."""
    org = _resolve_org_by_slug(db, org_slug)
    return list_api_keys(db, org_id=org.id)


@router.post("/api-keys", response_model=ApiKeyCreatedResponse)
async def generate_api_key_route(
    payload: ApiKeyCreateRequest,
    org_slug: str = "default",
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    try:
        org = _resolve_org_by_slug(db, org_slug)
        result = create_api_key(
            db,
            org_id=org.id,
            created_by_user_id=None,
            name=payload.name.strip(),
        )
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api-keys/{key_id}/revoke", response_model=ApiKeyListItem)
async def revoke_api_key_route(
    key_id: int,
    org_slug: str = "default",
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        org = _resolve_org_by_slug(db, org_slug)
        result = revoke_api_key(db, org_id=org.id, key_id=key_id)
        db.commit()
        return result
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
