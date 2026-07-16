"""
API Key Authentication Middleware for SentinelAI
"""

import logging
import os
from typing import Optional, Dict

from fastapi import HTTPException, status
from fastapi.security import HTTPBearer
from starlette.requests import Request

from app.services.database_service import DatabaseService
from app.services.api_key_service import verify_api_key_hash

logger = logging.getLogger(__name__)

# Configuration
API_KEYS = os.getenv("SENTINELAI_API_KEYS", "").split(",") if os.getenv("SENTINELAI_API_KEYS") else []
API_KEY_HEADER = "X-API-Key"  # Custom header for API keys

# HTTP Bearer scheme for token authentication
security = HTTPBearer(auto_error=False)


def get_api_key_from_request(request: Request) -> Optional[str]:
    """
    Extract API key from various sources:
    1. Authorization header (Bearer token)
    2. X-API-Key header
    3. Query parameter ?api_key=xxx
    """
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]

    api_key_header = request.headers.get(API_KEY_HEADER.lower())
    if api_key_header:
        return api_key_header

    return None


def verify_api_key(request: Request) -> Optional[Dict]:
    """
    Verify API key for external API access and return org-scoped context.

    Returns dict with org_id/api_key_id/prefix if valid,
    or raises HTTPException if key is invalid.
    """
    api_key = get_api_key_from_request(request)

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required. Provide API key in Authorization header or X-API-Key header.",
        )

    if API_KEYS and api_key not in API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    try:
        with DatabaseService.get_session() as db:
            key_row = verify_api_key_hash(db, raw_key=api_key)
            if key_row:
                db.add(key_row)
                db.flush()
                return {
                    "org_id": key_row.org_id,
                    "api_key_id": key_row.id,
                    "prefix": key_row.prefix,
                }

            if API_KEYS:
                return {"org_id": None, "api_key_id": None, "prefix": api_key[:12]}

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
    except HTTPException:
        raise
    except Exception:
        logger.exception("API key verification failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key verification failed",
        )


def get_api_key_dependency():
    """FastAPI dependency for API key authentication."""

    def dependency(request: Request):
        return verify_api_key(request)

    return dependency
