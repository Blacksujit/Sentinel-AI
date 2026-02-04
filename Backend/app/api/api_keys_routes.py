import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.services.api_key_service import create_api_key, list_api_keys, revoke_api_key
from app.storage.db import SessionLocal


router = APIRouter()


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
    return list_api_keys(db)


@router.post("/api-keys", response_model=ApiKeyCreatedResponse)
async def generate_api_key_route(
    payload: ApiKeyCreateRequest,
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    return create_api_key(db, name=payload.name.strip())


@router.post("/api-keys/{key_id}/revoke", response_model=ApiKeyListItem)
async def revoke_api_key_route(
    key_id: int,
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return revoke_api_key(db, key_id=key_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
