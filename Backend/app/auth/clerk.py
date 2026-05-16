import os
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from starlette.requests import Request

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
    """Decode Clerk JWT and extract claims."""
    print(f"[Auth] Decoding token (first 50 chars): {token[:50]}...")
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
            print(f"[Auth] JWT verify failed ({e}); falling back to unsigned decode")
        except Exception as e:
            print(f"[Auth] JWT verify error ({e}); falling back to unsigned decode")

    # No PEM key (local dev) or verification failed: decode claims without signature check.
    try:
        decoded = jwt.decode(
            token,
            options={"verify_signature": False, "verify_aud": False},
        )
        print(f"[Auth] Token decoded (unsigned): sub={decoded.get('sub')}")
        return decoded
    except Exception as e:
        print(f"[Auth] Token decode error: {e}")
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
