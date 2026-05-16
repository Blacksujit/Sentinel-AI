from fastapi import HTTPException, status
from starlette.requests import Request
from sqlalchemy.orm import Session
from app.storage.org_models import Organization, OrgMembership
from app.storage.user_models import User

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
