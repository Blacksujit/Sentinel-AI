import os
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from starlette.requests import Request

# Clerk JWT verification (keyless mode for now)
CLERK_JWT_KEY = os.getenv("CLERK_JWT_KEY")

def decode_clerk_token(token: str) -> Dict[str, Any]:
    """Decode Clerk JWT and extract claims (keyless mode)."""
    print(f"[Auth] Decoding token (first 50 chars): {token[:50]}...")
    if not CLERK_JWT_KEY:
        # Dev mode: decode without signature verification.
        # This still preserves real user identity (sub) from the token.
        try:
            decoded = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False},
            )
            print(f"[Auth] Token decoded successfully: {decoded}")
            return decoded
        except Exception as e:
            print(f"[Auth] Token decode error: {e}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

    try:
        payload = jwt.decode(token, CLERK_JWT_KEY, algorithms=["RS256"], options={"verify_aud": False})
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token verification failed")

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
    # Try standard Authorization header first
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        print(f"[Auth] Using Authorization header token")
        return decode_clerk_token(token)
    
    # Try x-clerk-auth-token header (from Next.js proxy)
    clerk_token = request.headers.get("x-clerk-auth-token")
    if clerk_token:
        print(f"[Auth] Using x-clerk-auth-token header")
        return decode_clerk_token(clerk_token)
    
    print(f"[Auth] No auth token found in headers")
    return None
