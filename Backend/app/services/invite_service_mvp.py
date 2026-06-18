"""MVP Invite Service for team member invitations."""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.storage.invite_models import OrgInvite, InviteStatus
from app.storage.org_models import Organization, OrgMembership
from app.storage.rbac_models import RbacRole
from app.services.email_service import EmailService
from app.services.audit_service import AuditService


class InviteServiceMVP:
    """MVP: Simple, sync invite flow (no retries, no job queue)."""

    def __init__(self, db: Session):
        self.db = db

    async def create_and_send_invite(
        self,
        org_id: int,
        email: str,
        role_id: int,
        invited_by_user_id: int,
    ) -> Dict[str, Any]:
        """
        Create invite and send email.
        
        Args:
            org_id: Organization ID
            email: Email to invite
            role_id: RBAC role ID for the invite
            invited_by_user_id: User ID sending the invite
            
        Returns:
            dict with invite_id, email, token, success status, and expires_at
        """
        org = self.db.query(Organization).filter_by(id=org_id).first()
        if not org:
            raise ValueError(f"Organization {org_id} not found")

        # Get role name for email
        role = self.db.query(RbacRole).filter_by(id=role_id).first()
        role_name = role.name if role else "Member"

        # Create invite
        token = OrgInvite.generate_token()
        expires_at = datetime.utcnow() + timedelta(days=7)

        invite = OrgInvite(
            org_id=org_id,
            email=email,
            role_id=role_id,
            invited_by_user_id=invited_by_user_id,
            token=token,
            status=InviteStatus.PENDING,
            expires_at=expires_at,
        )
        self.db.add(invite)
        self.db.flush()  # Get the ID before committing

        # Send email (sync, blocking)
        success = False
        try:
            success = await EmailService.send_org_invite_email(
                to_email=email,
                token=token,
                org_name=org.name,
                role_name=role_name,
                expires_in_days=7,
            )
        except Exception as e:
            print(f"[InviteService] Email send failed for {email}: {e}")

        self.db.commit()

        # Log audit event
        try:
            AuditService.log(
                self.db,
                org_id=org_id,
                actor_user_id=invited_by_user_id,
                actor_type="user",
                action="member.invited",
                target_type="invite",
                target_id=invite.id,
                event_metadata={
                    "email": email,
                    "token": token[:8] + "...",  # Redact for logs
                    "success": success,
                },
            )
        except Exception as e:
            print(f"[InviteService] Audit log failed: {e}")

        return {
            "invite_id": invite.id,
            "email": email,
            "token": token,
            "success": success,
            "expires_at": expires_at.isoformat(),
        }

    def accept_invite(self, token: str, user_id: int) -> Dict[str, Any]:
        """
        Accept invite and create membership.
        
        Args:
            token: Invite token from email
            user_id: User ID accepting the invite
            
        Returns:
            dict with org_id and membership_created status
            
        Raises:
            ValueError: If token is invalid, expired, or already processed
        """
        invite = self.db.query(OrgInvite).filter_by(token=token).first()

        if not invite:
            raise ValueError("Invalid invite token")

        if invite.status != InviteStatus.PENDING:
            status_msg = invite.status.value if invite.status else "unknown"
            raise ValueError(f"Invite already {status_msg}")

        if invite.expires_at < datetime.utcnow():
            invite.status = InviteStatus.EXPIRED
            self.db.commit()
            raise ValueError("Invite expired (valid for 7 days)")

        # Check if user is already a member
        existing_membership = self.db.query(OrgMembership).filter(
            and_(
                OrgMembership.org_id == invite.org_id,
                OrgMembership.user_id == user_id,
            )
        ).first()

        if existing_membership:
            # User is already a member, just mark invite as accepted
            invite.status = InviteStatus.ACCEPTED
            invite.accepted_at = datetime.utcnow()
            invite.accepted_by_user_id = user_id
            self.db.commit()
            return {
                "org_id": invite.org_id,
                "membership_created": False,
                "already_member": True,
            }

        # Create membership
        membership = OrgMembership(
            org_id=invite.org_id,
            user_id=user_id,
            role_id=invite.role_id,
        )
        self.db.add(membership)

        # Mark invite accepted
        invite.status = InviteStatus.ACCEPTED
        invite.accepted_at = datetime.utcnow()
        invite.accepted_by_user_id = user_id
        self.db.commit()

        # Log audit event
        try:
            AuditService.log(
                self.db,
                org_id=invite.org_id,
                actor_user_id=user_id,
                actor_type="user",
                action="member.accepted_invite",
                target_type="membership",
                target_id=membership.user_id,
            )
        except Exception as e:
            print(f"[InviteService] Audit log failed: {e}")

        return {
            "org_id": invite.org_id,
            "membership_created": True,
            "already_member": False,
        }

    def list_pending_invites(self, org_id: int) -> list:
        """List pending invites for an organization."""
        invites = self.db.query(OrgInvite).filter(
            and_(
                OrgInvite.org_id == org_id,
                OrgInvite.status == InviteStatus.PENDING,
            )
        ).all()

        return [
            {
                "id": inv.id,
                "email": inv.email,
                "role": inv.role.name if inv.role else "Unknown",
                "invited_by": inv.invited_by.name or inv.invited_by.email,
                "created_at": inv.created_at.isoformat(),
                "expires_at": inv.expires_at.isoformat(),
            }
            for inv in invites
        ]

    def revoke_invite(
        self, org_id: int, invite_id: int, revoked_by_user_id: int
    ) -> Dict[str, Any]:
        """Revoke a pending invite."""
        invite = self.db.query(OrgInvite).filter(
            and_(OrgInvite.id == invite_id, OrgInvite.org_id == org_id)
        ).first()

        if not invite:
            raise ValueError("Invite not found")

        if invite.status != InviteStatus.PENDING:
            raise ValueError("Can only revoke pending invites")

        invite.status = InviteStatus.CANCELLED
        self.db.commit()

        # Log audit event
        try:
            AuditService.log(
                self.db,
                org_id=org_id,
                actor_user_id=revoked_by_user_id,
                actor_type="user",
                action="member.invite_revoked",
                target_type="invite",
                target_id=invite_id,
            )
        except Exception as e:
            print(f"[InviteService] Audit log failed: {e}")

        return {"invite_id": invite_id, "status": "cancelled"}
