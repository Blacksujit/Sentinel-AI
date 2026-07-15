"""
Organization sync service for Clerk integration.
Syncs Clerk organizations with SentinelAI database.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.storage.org_models import Organization, OrgMembership, PlanTier
from app.storage.user_models import User
from app.storage.rbac_models import RbacRole
from app.storage.baseline_config_models import BaselineConfiguration, DEFAULT_BASELINE_CONFIG
from app.services.audit_service import AuditService


class OrganizationSyncService:
    """Sync Clerk organizations with SentinelAI database."""
    
    @staticmethod
    def sync_from_clerk(
        clerk_org_id: str,
        name: str,
        slug: str,
        owner_clerk_user_id: str,
        company_email: Optional[str] = None,
        db: Session = None
    ) -> Organization:
        """
        Create or update organization from Clerk webhook/event.
        
        Args:
            clerk_org_id: Clerk organization ID
            name: Organization name
            slug: Organization slug
            owner_clerk_user_id: Clerk user ID of owner
            company_email: Optional company email for domain verification
            db: Database session
            
        Returns:
            Organization: Created or updated organization
        """
        if db is None:
            from app.storage.db import SessionLocal
            db = SessionLocal()
            should_close = True
        else:
            should_close = False
        
        try:
            # Find owner user
            owner = db.query(User).filter(
                User.clerk_user_id == owner_clerk_user_id
            ).first()
            
            if not owner:
                raise ValueError(f"Owner user not found: {owner_clerk_user_id}")
            
            # Check if org exists by clerk_org_id
            org = db.query(Organization).filter(
                Organization.clerk_org_id == clerk_org_id
            ).first()
            
            if org:
                # Update existing organization
                org.name = name
                org.slug = slug
                org.company_email = company_email or org.company_email
                org.updated_at = datetime.utcnow()
                
                db.commit()
                return org
            
            # Create new organization
            org = Organization(
                clerk_org_id=clerk_org_id,
                name=name,
                slug=slug,
                company_email=company_email,
                owner_user_id=owner.id,
                plan_tier=PlanTier.FREE,
                baseline_config=DEFAULT_BASELINE_CONFIG.copy()
            )
            db.add(org)
            db.flush()  # Get org.id
            
            # Create or get admin role
            admin_role = db.query(RbacRole).filter(
                RbacRole.name == "admin",
                RbacRole.org_id == org.id
            ).first()
            
            if not admin_role:
                admin_role = RbacRole(
                    name="admin",
                    org_id=org.id,
                    permissions=["*"]  # All permissions
                )
                db.add(admin_role)
                db.flush()
            
            # Create owner membership
            membership = OrgMembership(
                user_id=owner.id,
                org_id=org.id,
                role_id=admin_role.id
            )
            db.add(membership)
            
            # Create default baseline configuration
            baseline = BaselineConfiguration(
                org_id=org.id,
                created_by_user_id=owner.id,
                **DEFAULT_BASELINE_CONFIG
            )
            db.add(baseline)

            # Create default workspace
            from app.services.workspace_service import WorkspaceService
            from app.storage.workspace_models import Workspace
            existing_workspace = db.query(Workspace).filter(Workspace.org_id == org.id).first()
            if not existing_workspace:
                default_workspace = WorkspaceService.create_workspace(
                    db=db, org_id=org.id, name="Default Workspace",
                    created_by_user_id=owner.id,
                )
                default_workspace.is_default = True
                WorkspaceService.create_default_workspace_roles(db, default_workspace.id)
            
            # Audit log
            AuditService.log(
                db=db,
                org_id=org.id,
                actor_user_id=owner.id,
                action="org.created",
                target_type="organization",
                target_id=org.id,
                target_name=org.name,
                event_metadata={
                    "clerk_org_id": clerk_org_id,
                    "plan_tier": PlanTier.FREE.value,
                    "company_email": company_email
                }
            )
            
            db.commit()
            return org
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            if should_close:
                db.close()
    
    @staticmethod
    def update_organization(
        org_id: int,
        name: Optional[str] = None,
        company_email: Optional[str] = None,
        plan_tier: Optional[PlanTier] = None,
        db: Session = None,
        updated_by_user_id: Optional[int] = None
    ) -> Organization:
        """
        Update organization details.
        
        Args:
            org_id: Organization ID
            name: New name
            company_email: New company email
            plan_tier: New plan tier
            db: Database session
            updated_by_user_id: User making the update
            
        Returns:
            Organization: Updated organization
        """
        if db is None:
            from app.storage.db import SessionLocal
            db = SessionLocal()
            should_close = True
        else:
            should_close = False
        
        try:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                raise ValueError(f"Organization not found: {org_id}")
            
            previous_values = {}
            new_values = {}
            
            if name and name != org.name:
                previous_values["name"] = org.name
                new_values["name"] = name
                org.name = name
            
            if company_email is not None and company_email != org.company_email:
                previous_values["company_email"] = org.company_email
                new_values["company_email"] = company_email
                org.company_email = company_email
            
            if plan_tier and plan_tier != org.plan_tier:
                previous_values["plan_tier"] = org.plan_tier.value if org.plan_tier else None
                new_values["plan_tier"] = plan_tier.value
                org.plan_tier = plan_tier
            
            org.updated_at = datetime.utcnow()
            
            # Audit log if changes made
            if previous_values and updated_by_user_id:
                AuditService.log(
                    db=db,
                    org_id=org.id,
                    actor_user_id=updated_by_user_id,
                    action="org.updated",
                    target_type="organization",
                    target_id=org.id,
                    target_name=org.name,
                    previous_values=previous_values,
                    new_values=new_values
                )
            
            db.commit()
            return org
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            if should_close:
                db.close()
    
    @staticmethod
    def delete_organization(
        org_id: int,
        db: Session = None,
        deleted_by_user_id: Optional[int] = None
    ) -> bool:
        """
        Delete organization (soft delete by marking as deleted).
        
        Args:
            org_id: Organization ID
            db: Database session
            deleted_by_user_id: User making the deletion
            
        Returns:
            bool: True if deleted successfully
        """
        if db is None:
            from app.storage.db import SessionLocal
            db = SessionLocal()
            should_close = True
        else:
            should_close = False
        
        try:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                raise ValueError(f"Organization not found: {org_id}")
            
            org_name = org.name
            
            # Audit log before deletion
            if deleted_by_user_id:
                AuditService.log(
                    db=db,
                    org_id=org.id,
                    actor_user_id=deleted_by_user_id,
                    action="org.deleted",
                    target_type="organization",
                    target_id=org.id,
                    target_name=org_name,
                    event_metadata={"deleted_at": datetime.utcnow().isoformat()}
                )
            
            # Note: In production, implement soft delete with a "deleted_at" column
            # For MVP, we do hard delete but revoke all API keys first
            
            # Revoke all API keys
            from app.storage.api_key_models import ApiKey, ApiKeyStatus
            api_keys = db.query(ApiKey).filter(ApiKey.org_id == org_id).all()
            for key in api_keys:
                key.status = ApiKeyStatus.REVOKED
                key.revoked_at = datetime.utcnow()
                if deleted_by_user_id:
                    key.revoked_by_user_id = deleted_by_user_id
            
            db.delete(org)
            db.commit()
            return True
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            if should_close:
                db.close()
    
    @staticmethod
    def get_organization_by_clerk_id(
        clerk_org_id: str,
        db: Session = None
    ) -> Optional[Organization]:
        """Get organization by Clerk organization ID."""
        if db is None:
            from app.storage.db import SessionLocal
            db = SessionLocal()
            should_close = True
        else:
            should_close = False
        
        try:
            return db.query(Organization).filter(
                Organization.clerk_org_id == clerk_org_id
            ).first()
        finally:
            if should_close:
                db.close()
    
    @staticmethod
    def list_user_organizations(
        user_id: int,
        db: Session = None
    ) -> list:
        """List all organizations where user is a member."""
        if db is None:
            from app.storage.db import SessionLocal
            db = SessionLocal()
            should_close = True
        else:
            should_close = False
        
        try:
            memberships = db.query(OrgMembership).filter(
                OrgMembership.user_id == user_id
            ).all()
            
            orgs = []
            for membership in memberships:
                org = db.query(Organization).filter(
                    Organization.id == membership.org_id
                ).first()
                if org:
                    orgs.append({
                        "organization": org,
                        "role_id": membership.role_id,
                        "joined_at": membership.joined_at
                    })
            
            return orgs
        finally:
            if should_close:
                db.close()
