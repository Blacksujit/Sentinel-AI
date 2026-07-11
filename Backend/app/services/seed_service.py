"""Database seeding for multi-tenant RBAC system."""

from sqlalchemy.orm import Session
from app.storage.rbac_models import RbacPermission, RbacRole, rbac_role_permissions
from app.rbac.permissions import PERMISSION_REGISTRY


def seed_rbac_data(db: Session) -> None:
    """Seed default RBAC permissions and roles."""
    existing_perms = {p.key for p in db.query(RbacPermission).all()}
    for key, description in PERMISSION_REGISTRY.items():
        if key not in existing_perms:
            perm = RbacPermission(key=key, description=description)
            db.add(perm)
    db.flush()

    default_roles = {
        "OWNER": list(PERMISSION_REGISTRY.keys()),
        "ADMIN": [
            "org.manage",
            "member.invite",
            "member.remove",
            "member.role_update",
            "apikey.create",
            "apikey.revoke",
            "apikey.rotate",
            "usage.view",
            "settings.update",
        ],
        "DEVELOPER": [
            "apikey.create",
            "apikey.revoke",
            "apikey.rotate",
            "usage.view",
        ],
        "VIEWER": [
            "usage.view",
        ],
    }

    for role_name, perm_keys in default_roles.items():
        role = db.query(RbacRole).filter(RbacRole.name == role_name, RbacRole.org_id.is_(None)).first()
        if not role:
            role = RbacRole(name=role_name, org_id=None)
            db.add(role)
            db.flush()

            for perm_key in perm_keys:
                perm = db.query(RbacPermission).filter(RbacPermission.key == perm_key).first()
                if perm:
                    db.execute(
                        rbac_role_permissions.insert().values(
                            role_id=role.id,
                            permission_id=perm.id
                        )
                    )
    db.commit()


def seed_all(db: Session) -> None:
    """Run all database seeding."""
    seed_rbac_data(db)
