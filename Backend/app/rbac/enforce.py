from fastapi import HTTPException, status, Depends
from starlette.requests import Request
from sqlalchemy.orm import Session
from app.tenancy.org_context import resolve_org_from_request, require_org_membership
from app.rbac.permissions import user_permissions_for_org

def require_permission(permission_key: str, fallback_org_id: int | None = None):
    """FastAPI dependency factory: require a specific permission."""
    def dependency(request: Request, db: Session = Depends(get_db)):
        # Resolve org and membership
        org = resolve_org_from_request(request, db, fallback_org_id=fallback_org_id)
        clerk_user_id = getattr(request.state, "clerk_user_id", None)
        if not clerk_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        # Get user from request.state (set by auth middleware)
        from app.storage.user_models import User
        user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        membership = require_org_membership(db, user.id, org.id)
        perms = user_permissions_for_org(db, user.id, org.id)
        if permission_key not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission_key}"
            )
        # Attach org/user to request.state for downstream use
        request.state.org = org
        request.state.membership = membership
        return {"org": org, "user": user, "membership": membership, "permissions": perms}
    return dependency

def require_permission_from_path(permission_key: str):
    """Dependency that extracts org_id from path parameter and checks permission."""
    def dependency(request: Request, db: Session = Depends(get_db)):
        # Extract org_id from path parameters
        path_params = request.path_params
        org_id = path_params.get("org_id")
        if org_id:
            try:
                org_id = int(org_id)
            except (ValueError, TypeError):
                raise ValueError("Invalid org_id in path")
        # Use the org_id as fallback for permission check
        perm_dep = require_permission(permission_key, fallback_org_id=org_id)
        return perm_dep(request, db)
    return Depends(dependency)

# Helper to get DB session (reuse existing pattern)
from app.storage.db import SessionLocal
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
