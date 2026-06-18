from fastapi import Depends, HTTPException, status
from starlette.requests import Request
from sqlalchemy.orm import Session
from app.auth.clerk import extract_clerk_claims
from app.services.user_service import UserService
from app.storage.db import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def require_authenticated_user(request: Request, db: Session = Depends(get_db)):
    """FastAPI dependency: ensure Clerk user exists in SentinelAI."""
    claims = extract_clerk_claims(request)
    if not claims or not claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    clerk_user_id = str(claims.get("sub"))
    email = str(
        claims.get("email")
        or claims.get("email_address")
        or claims.get("primary_email")
        or ""
    )
    if not email:
        # Clerk JWT templates sometimes omit email; keep DB invariant (email is NOT NULL).
        email = f"{clerk_user_id}@clerk.local"

    name = claims.get("name") or claims.get("full_name") or claims.get("given_name")

    user = UserService.get_or_create_user(
        db,
        clerk_user_id=clerk_user_id,
        email=email,
        name=name,
    )
    UserService.update_last_login(db, clerk_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User creation failed"
        )
    # Attach user to request.state for downstream use
    request.state.clerk_user_id = clerk_user_id
    request.state.user = user
    return user
