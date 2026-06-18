import os
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from starlette.requests import Request

def _is_development() -> bool:
    return os.getenv("ENVIRONMENT", "production") == "development"


def _clerk_jwt_public_key() -> Optional[str]:
    """
    PEM public key for Clerk JWT verification (Dashboard → API keys → JWT public key).
    Do NOT use CLERK_SECRET_KEY (sk_...) here — that is not a JWT verification key.
    """
    key = (os.getenv("CLERK_JWT_KEY") or os.getenv("CLERK_JWT_PUBLIC_KEY") or "").strip()
    if not key or key.startswith("sk_") or key.startswith("pk_"):
        return None
    if "BEGIN" not in key:
        return None
    return key.replace("\\n", "\n")


def decode_clerk_token(token: str) -> Dict[str, Any]:
    """Decode Clerk JWT and extract claims.
    
    In production, signature verification is REQUIRED. If no PEM key is
    configured or verification fails, the request is rejected.
    In development, unsigned decode is allowed for local convenience.
    """
    jwt_public_key = _clerk_jwt_public_key()

    if jwt_public_key:
        try:
            payload = jwt.decode(
                token,
                jwt_public_key,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token signature: {e}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {e}",
            )

    # No PEM key configured
    if not _is_development():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT verification key not configured. Set CLERK_JWT_KEY or CLERK_JWT_PUBLIC_KEY.",
        )

    # Development only: decode unsigned for local convenience
    try:
        decoded = jwt.decode(
            token,
            options={"verify_signature": False, "verify_aud": False},
        )
        return decoded
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

def extract_clerk_user_id(request: Request) -> Optional[str]:
    """Extract Clerk user ID from Authorization Bearer token."""
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    claims = decode_clerk_token(token)
    return claims.get("sub")


def extract_clerk_claims(request: Request) -> Optional[Dict[str, Any]]:
    """Extract Clerk claims from Authorization Bearer token or x-clerk-auth-token header."""
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        return decode_clerk_token(token)

    clerk_token = request.headers.get("x-clerk-auth-token")
    if clerk_token:
        return decode_clerk_token(clerk_token)

    return None
