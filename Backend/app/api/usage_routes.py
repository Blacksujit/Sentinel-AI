from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.auth.dependencies import get_db
from app.rbac.enforce import require_permission_from_path
from app.tenancy.org_context import resolve_org
from app.services.usage_service import UsageService

router = APIRouter()

@router.get("/orgs/{org_id}/usage")
async def get_usage(
    org_id: str,
    _: None = require_permission_from_path("usage.view"),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Return aggregated usage for an organization."""
    org = resolve_org(db, org_id)
    return UsageService.aggregate_for_org(db, org.id)


@router.get("/orgs/{org_id}/usage/stats")
async def get_org_stats(
    org_id: str,
    db: Session = Depends(get_db),
    _: None = require_permission_from_path("usage.view"),
):
    """Get organization usage statistics for dashboard."""
    org = resolve_org(db, org_id)
    return UsageService.aggregate_for_org(db, org.id)


@router.get("/orgs/{org_id}/usage/trend")
async def get_usage_trend(
    org_id: str,
    _: None = require_permission_from_path("usage.view"),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Return daily risk event aggregation for risk trend charts."""
    org = resolve_org(db, org_id)
    return UsageService.get_trend(db, org.id, days)
