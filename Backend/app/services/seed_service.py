"""Database seeding for multi-tenant RBAC system."""

from sqlalchemy.orm import Session
from app.storage.rbac_models import RbacPermission, RbacRole, rbac_role_permissions
from app.storage.org_models import Organization, OrgMembership, PlanTier
from app.storage.user_models import User
from app.rbac.permissions import PERMISSION_REGISTRY


def seed_rbac_data(db: Session) -> None:
    """Seed default RBAC permissions and roles."""
    # Seed permissions
    existing_perms = {p.key for p in db.query(RbacPermission).all()}
    for key, description in PERMISSION_REGISTRY.items():
        if key not in existing_perms:
            perm = RbacPermission(key=key, description=description)
            db.add(perm)
    db.flush()
    
    # Seed default roles
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
            
            # Assign permissions
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


def seed_default_org(db: Session) -> None:
    """Seed default organization for legacy/admin use."""
    org = db.query(Organization).filter(Organization.slug == "default").first()
    if not org:
        # Create system user first
        system_user = db.query(User).filter(User.clerk_user_id == "system").first()
        if not system_user:
            system_user = User(
                clerk_user_id="system",
                email="system@sentinelai.local",
                name="System"
            )
            db.add(system_user)
            db.flush()
        
        # Create default org
        org = Organization(
            clerk_org_id="org_default_system",  # Add required clerk_org_id
            name="Default Organization",
            slug="default",
            owner_user_id=system_user.id,
            plan_tier=PlanTier.FREE,
        )
        db.add(org)
        db.flush()
        
        # Add system user as OWNER member
        owner_role = db.query(RbacRole).filter(RbacRole.name == "OWNER", RbacRole.org_id.is_(None)).first()
        if owner_role:
            membership = OrgMembership(
                user_id=system_user.id,
                org_id=org.id,
                role_id=owner_role.id,
            )
            db.add(membership)
        
        db.commit()


def seed_all(db: Session) -> None:
    """Run all database seeding."""
    seed_rbac_data(db)
    seed_default_org(db)
