from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.auth.dependencies import require_authenticated_user, get_db
from app.tenancy.org_context import resolve_org_from_request, require_org_membership
from app.rbac.enforce import require_permission_from_path
from app.services.usage_service import UsageService

router = APIRouter()

@router.get("/orgs/{org_id}/usage")
async def get_usage(
    org_id: int,
    _: None = require_permission_from_path("usage.view"),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Return aggregated usage for an organization."""
    return UsageService.aggregate_for_org(db, org_id)


@router.get("/orgs/{org_id}/usage/stats")
async def get_org_stats(
    org_id: int,
    db: Session = Depends(get_db),
    user = Depends(require_authenticated_user)
):
    """Get organization usage statistics for dashboard."""
    return UsageService.aggregate_for_org(db, org_id)
