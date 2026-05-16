import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.services.api_key_service import create_api_key, list_api_keys, revoke_api_key
from app.storage.db import SessionLocal
from app.storage.user_models import User
from app.storage.org_models import Organization
from app.services.database_service import DatabaseService

router = APIRouter()

# Default org/user for legacy admin routes
def get_default_org_id(db: Session) -> int:
    """Get or create default organization for legacy admin API keys."""
    org = db.query(Organization).filter(Organization.slug == "default").first()
    if not org:
        # Create default org
        system_user = db.query(User).filter(User.clerk_user_id == "system").first()
        if not system_user:
            system_user = User(clerk_user_id="system", email="system@sentinelai.local", name="System")
            db.add(system_user)
            db.flush()
        org = Organization(
            name="Default Organization",
            slug="default",
            owner_user_id=system_user.id,
        )
        db.add(org)
        db.flush()
    return org.id

def get_system_user_id(db: Session) -> int:
    """Get or create system user for legacy admin API keys."""
    user = db.query(User).filter(User.clerk_user_id == "system").first()
    if not user:
        user = User(clerk_user_id="system", email="system@sentinelai.local", name="System")
        db.add(user)
        db.flush()
    return user.id


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all API keys (legacy admin route - uses default org)."""
    org_id = get_default_org_id(db)
    return list_api_keys(db, org_id=org_id)


@router.post("/api-keys", response_model=ApiKeyCreatedResponse)
async def generate_api_key_route(
    payload: ApiKeyCreateRequest,
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    try:
        org_id = get_default_org_id(db)
        created_by = get_system_user_id(db)
        result = create_api_key(db, org_id=org_id, created_by_user_id=created_by, name=payload.name.strip())
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
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        org_id = get_default_org_id(db)
        result = revoke_api_key(db, org_id=org_id, key_id=key_id)
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
