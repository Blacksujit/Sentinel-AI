from fastapi import HTTPException, status, Depends
from starlette.requests import Request
from sqlalchemy.orm import Session
from app.storage.org_models import Organization, OrgMembership
from app.storage.user_models import User
from app.storage.workspace_models import Workspace, WorkspaceMember
from app.auth.dependencies import get_db


def resolve_org(db: Session, identifier: str) -> Organization:
    """Resolve an organization by clerk_org_id, numeric DB id, or slug."""
    org = db.query(Organization).filter(Organization.clerk_org_id == identifier).first()
    if org:
        return org
    if identifier.isdigit():
        org = db.query(Organization).filter(Organization.id == int(identifier)).first()
        if org:
            return org
    org = db.query(Organization).filter(Organization.slug == identifier).first()
    if org:
        return org
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Organization not found: {identifier}"
    )


def resolve_org_from_request(request: Request, db: Session, fallback_org_id: int | None = None) -> Organization:
    """Resolve active organization from X-Org-Id header or fallback_org_id."""
    org_id: int | None = None
    org_id_header = request.headers.get("x-org-id")
    if org_id_header:
        try:
            org_id = int(org_id_header)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Org-Id header"
            )
    elif fallback_org_id is not None:
        org_id = int(fallback_org_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization context required"
        )

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return org

def require_org_membership(db: Session, user_id: int, org_id: int) -> OrgMembership:
    """Validate that the user belongs to the org and return membership."""
    membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user_id)
        .filter(OrgMembership.org_id == org_id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this organization"
        )
    return membership


def require_workspace_member(workspace_id: int, user_id: int, db: Session) -> WorkspaceMember:
    """Validate that the user is a member of the workspace."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    membership = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .filter(WorkspaceMember.user_id == user_id)
        .filter(WorkspaceMember.is_active == True)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this workspace"
        )
    return membership


def require_workspace_member_from_path(request: Request, db: Session = Depends(get_db)):
    """FastAPI dependency: require workspace membership extracted from path parameter."""
    path_params = request.path_params
    workspace_id = path_params.get("workspace_id")
    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace ID required in path"
        )
    try:
        workspace_id = int(workspace_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID in path"
        )

    clerk_user_id = getattr(request.state, "clerk_user_id", None)
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    from app.storage.user_models import User
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return require_workspace_member(workspace_id, user.id, db)
