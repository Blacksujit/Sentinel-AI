import os
import logging
from datetime import datetime, timezone
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.middleware.auth import get_api_key_from_request

logger = logging.getLogger(__name__)

PLAN_ENFORCEMENT_ENABLED = os.getenv("PLAN_ENFORCEMENT_ENABLED", "true").lower() == "true"

MONTHLY_LIMITS = {
    "free": 1000,
    "pro": 50000,
    "team": 500000,
    "enterprise": 999999999,
}

FEATURE_FLAGS = {
    "free": {
        "max_api_keys": 1,
        "max_seats": 1,
        "webhooks": False,
        "audit_logs": False,
        "custom_detectors": False,
        "sso": False,
        "sla": False,
        "priority_support": False,
    },
    "pro": {
        "max_api_keys": 5,
        "max_seats": 5,
        "webhooks": True,
        "audit_logs": False,
        "custom_detectors": False,
        "sso": False,
        "sla": False,
        "priority_support": True,
    },
    "team": {
        "max_api_keys": 25,
        "max_seats": 20,
        "webhooks": True,
        "audit_logs": True,
        "custom_detectors": True,
        "sso": False,
        "sla": False,
        "priority_support": True,
    },
    "enterprise": {
        "max_api_keys": 9999,
        "max_seats": 9999,
        "webhooks": True,
        "audit_logs": True,
        "custom_detectors": True,
        "sso": True,
        "sla": True,
        "priority_support": True,
    },
}


class PlanEnforcerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not PLAN_ENFORCEMENT_ENABLED:
            return await call_next(request)

        skip_paths = ("/metrics", "/health", "/readiness", "/liveness", "/api/health")
        if request.url.path.startswith(skip_paths):
            return await call_next(request)

        org_id = None
        plan_tier = "free"

        api_key = get_api_key_from_request(request)

        if api_key:
            try:
                from app.storage.db import SessionLocal
                from app.services.api_key_service import verify_api_key_hash
                db = SessionLocal()
                try:
                    key_row = verify_api_key_hash(db, raw_key=api_key)
                    if key_row and key_row.org:
                        org_id = key_row.org_id
                        plan_tier = key_row.org.plan_tier.value
                finally:
                    db.close()
            except Exception as e:
                logger.debug("Could not resolve API key for plan enforcement: %s", e)

        if org_id is None:
            try:
                clerk_user = getattr(request.state, "user", None)
                if clerk_user:
                    orgs = getattr(clerk_user, "organizations", [])
                    if orgs and hasattr(orgs[0], "plan_tier"):
                        org_id = orgs[0].id
                        plan_tier = orgs[0].plan_tier.value
            except Exception:
                pass

        if org_id is None or plan_tier == "enterprise":
            return await call_next(request)

        monthly_limit = MONTHLY_LIMITS.get(plan_tier, 1000)
        if monthly_limit >= 999999999:
            return await call_next(request)

        try:
            from app.storage.db import SessionLocal
            from app.storage.usage_models import UsageEvent
            from app.storage.billing_models import Subscription, SubscriptionStatus
            db = SessionLocal()
            try:
                sub = db.query(Subscription).filter(
                    Subscription.org_id == org_id,
                    Subscription.status.in_([
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.PAST_DUE,
                        SubscriptionStatus.TRIALING,
                    ]),
                ).first()

                if sub and sub.current_period_start:
                    period_start = sub.current_period_start
                else:
                    now = datetime.now(timezone.utc)
                    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

                used = db.query(UsageEvent).filter(
                    UsageEvent.org_id == org_id,
                    UsageEvent.timestamp >= period_start,
                ).count()

                if used >= monthly_limit:
                    reset_date = period_start.replace(month=period_start.month + 1).strftime("%Y-%m-%d")
                    return JSONResponse(
                        status_code=429,
                        content={
                            "error": "monthly_limit_exceeded",
                            "message": "Your plan's monthly API call limit has been reached.",
                            "upgrade_url": "/billing",
                            "current_plan": plan_tier,
                            "suggested_plan": "pro" if plan_tier == "free" else "enterprise",
                            "usage": {
                                "used": used,
                                "limit": monthly_limit,
                                "reset_date": reset_date,
                            },
                        },
                    )
            finally:
                db.close()
        except Exception as e:
            logger.error("Plan enforcement check failed: %s", e)

        return await call_next(request)
