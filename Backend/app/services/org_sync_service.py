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
            
            # Assign seeded system OWNER role (permissions come from seed_rbac_data;
            # creating an org-scoped role here would orphan permission grants).
            owner_role = db.query(RbacRole).filter(
                RbacRole.name == "OWNER",
                RbacRole.org_id.is_(None)
            ).first()
            if not owner_role:
                raise ValueError("System OWNER role not found; run seed_rbac_data() first")
            
            # Create owner membership
            membership = OrgMembership(
                user_id=owner.id,
                org_id=org.id,
                role_id=owner_role.id
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
                actor_type="user",
                action="org.created",
                target_type="organization",
                target_id=org.id,
                event_metadata={
                    "target_name": org.name,
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
                    actor_type="user",
                    action="org.updated",
                    target_type="organization",
                    target_id=org.id,
                    event_metadata={
                        "target_name": org.name,
                        "previous_values": previous_values,
                        "new_values": new_values
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
                    actor_type="user",
                    action="org.deleted",
                    target_type="organization",
                    target_id=org.id,
                    event_metadata={
                        "target_name": org_name,
                        "deleted_at": datetime.utcnow().isoformat()
                    }
                )
            
            # Purge dependent rows in FK-safe order. Audit logs and risk logs are
            # DETACHED (org_id -> NULL) instead of deleted to preserve compliance
            # and analysis history; everything else is removed with the org.
            from app.storage.workspace_models import (
                Workspace, WorkspaceMember, WorkspaceRole, WorkspaceInvite,
            )
            from app.storage.api_key_models import ApiKey, ApiKeyStatus
            from app.storage.invite_models import OrgInvite
            from app.storage.usage_models import UsageEvent, AuditLog
            from app.storage.models import RiskLog
            from app.storage.baseline_config_models import (
                BaselineConfiguration, BaselineConfigurationHistory,
            )

            workspace_ids = [
                w.id for w in db.query(Workspace.id).filter(Workspace.org_id == org_id).all()
            ]
            if workspace_ids:
                db.query(WorkspaceInvite).filter(
                    WorkspaceInvite.workspace_id.in_(workspace_ids)
                ).delete(synchronize_session=False)
                db.query(WorkspaceMember).filter(
                    WorkspaceMember.workspace_id.in_(workspace_ids)
                ).delete(synchronize_session=False)
                db.query(WorkspaceRole).filter(
                    WorkspaceRole.workspace_id.in_(workspace_ids)
                ).delete(synchronize_session=False)
                db.query(Workspace).filter(Workspace.org_id == org_id).delete(
                    synchronize_session=False
                )
            db.query(OrgMembership).filter(OrgMembership.org_id == org_id).delete(
                synchronize_session=False
            )
            db.query(OrgInvite).filter(OrgInvite.org_id == org_id).delete(
                synchronize_session=False
            )
            api_keys = db.query(ApiKey).filter(ApiKey.org_id == org_id).all()
            for key in api_keys:
                key.status = ApiKeyStatus.REVOKED
                key.revoked_at = datetime.utcnow()
                if deleted_by_user_id:
                    key.revoked_by_user_id = deleted_by_user_id
                db.delete(key)
            db.query(UsageEvent).filter(UsageEvent.org_id == org_id).delete(
                synchronize_session=False
            )
            db.query(RbacRole).filter(RbacRole.org_id == org_id).delete(
                synchronize_session=False
            )
            db.query(BaselineConfigurationHistory).filter(
                BaselineConfigurationHistory.org_id == org_id
            ).delete(synchronize_session=False)
            db.query(BaselineConfiguration).filter(
                BaselineConfiguration.org_id == org_id
            ).delete(synchronize_session=False)

            # Detach rather than delete: preserve audit + risk history
            db.query(AuditLog).filter(AuditLog.org_id == org_id).update(
                {AuditLog.org_id: None}, synchronize_session=False
            )
            db.query(RiskLog).filter(RiskLog.org_id == org_id).update(
                {RiskLog.org_id: None}, synchronize_session=False
            )

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
