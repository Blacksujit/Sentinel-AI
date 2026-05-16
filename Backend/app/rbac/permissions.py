from typing import List, Set
from sqlalchemy.orm import Session
from app.storage.rbac_models import RbacPermission, RbacRole, rbac_role_permissions

# Permission registry (can be extended)
PERMISSION_REGISTRY = {
    "org.manage": "Manage organization settings and billing",
    "member.invite": "Invite members to organization",
    "member.remove": "Remove members from organization",
    "member.role_update": "Update member roles",
    "apikey.create": "Create API keys",
    "apikey.revoke": "Revoke API keys",
    "apikey.rotate": "Rotate API keys",
    "usage.view": "View usage analytics",
    "settings.update": "Update organization settings",
}

def get_permission_keys() -> List[str]:
    """Return all registered permission keys."""
    return list(PERMISSION_REGISTRY.keys())

def get_permission_description(key: str) -> str:
    """Return description for a permission key."""
    return PERMISSION_REGISTRY.get(key, "Unknown permission")

def role_has_permission(db: Session, role_id: int, permission_key: str) -> bool:
    """Check if a role has a given permission."""
    permission = (
        db.query(RbacPermission)
        .filter(RbacPermission.key == permission_key)
        .first()
    )
    if not permission:
        return False

    # Check many-to-many via association table
    has = (
        db.query(rbac_role_permissions)
        .filter(rbac_role_permissions.c.role_id == role_id)
        .filter(rbac_role_permissions.c.permission_id == permission.id)
        .first()
    )
    return has is not None

def user_permissions_for_org(db: Session, user_id: int, org_id: int) -> Set[str]:
    """Return all permission keys a user has in a specific org."""
    from app.storage.org_models import OrgMembership

    membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user_id)
        .filter(OrgMembership.org_id == org_id)
        .first()
    )
    if not membership:
        return set()

    # Load role and its permissions
    role = (
        db.query(RbacRole)
        .filter(RbacRole.id == membership.role_id)
        .first()
    )
    if not role:
        return set()

    permission_keys = set()
    for perm in role.permissions:
        permission_keys.add(perm.key)
    return permission_keys
