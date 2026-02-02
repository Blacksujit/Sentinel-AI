"""
API Key Authentication Middleware for SentinelAI
"""

from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.requests import Request
import os
from typing import Optional

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
    # Try Authorization header (Bearer token)
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    
    # Try X-API-Key header
    api_key_header = request.headers.get(API_KEY_HEADER.lower())
    if api_key_header:
        return api_key_header
    
    # Try query parameter
    api_key_param = request.query_params.get("api_key")
    if api_key_param:
        return api_key_param
    
    return None


def verify_api_key(request: Request) -> Optional[str]:
    """
    Verify API key for external API access.
    
    Returns the API key if valid, None if no key provided (for development),
    or raises HTTPException if key is invalid.
    """
    # Skip API key verification for development
    if os.getenv("ENVIRONMENT") == "development" and not API_KEYS:
        return "development-mode"
    
    api_key = get_api_key_from_request(request)
    
    # If no API key provided, check if we're in development mode
    if not api_key:
        if os.getenv("ENVIRONMENT") == "development":
            return "development-mode"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required. Provide API key in Authorization header, X-API-Key header, or api_key query parameter."
            )
    
    # Verify API key against allowed keys
    if API_KEYS and api_key not in API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return api_key


def get_api_key_dependency():
    """
    FastAPI dependency for API key authentication.
    """
    def dependency(request: Request):
        return verify_api_key(request)
    
    return dependency
