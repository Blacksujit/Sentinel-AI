from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.auth.dependencies import require_authenticated_user, get_db
from app.tenancy.org_context import require_org_membership
from app.rbac.enforce import require_permission
from app.rbac.permissions import user_permissions_for_org
from app.services.audit_service import AuditService
from app.storage.org_models import OrgMembership, Organization
from app.storage.user_models import User
from app.storage.rbac_models import RbacRole
from app.storage.invite_models import OrgInvite, InviteStatus

router = APIRouter()

# Role hierarchy for permission checking (higher = more powerful)
ROLE_HIERARCHY = {
    "VIEWER": 1,
    "DEVELOPER": 2,
    "ADMIN": 3,
    "OWNER": 4,
}

# Pydantic models
class MemberInviteRequest(BaseModel):
    email: EmailStr
    role: str

class MemberInviteResponse(BaseModel):
    id: int
    email: str
    role: str
    status: str
    invited_by: Optional[str]
    created_at: datetime
    expires_at: datetime

class MemberResponse(BaseModel):
    user_id: int
    email: str
    name: Optional[str]
    role: str
    joined_at: datetime

class RoleUpdateRequest(BaseModel):
    role: str

class AcceptInviteRequest(BaseModel):
    token: str


def get_role_level(role_name: str) -> int:
    """Get hierarchy level for a role name."""
    return ROLE_HIERARCHY.get(role_name.upper(), 0)


def can_manage_role(db: Session, user_id: int, org_id: int, target_role_name: str) -> bool:
    """Check if user can assign/manage a specific role (can't assign higher than self)."""
    # Get user's membership and role
    user_membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user_id)
        .filter(OrgMembership.org_id == org_id)
        .first()
    )
    if not user_membership:
        return False

    user_role = db.query(RbacRole).filter(RbacRole.id == user_membership.role_id).first()
    if not user_role:
        return False

    user_level = get_role_level(user_role.name)
    target_level = get_role_level(target_role_name)

    return user_level >= target_level


def get_user_role_name(db: Session, user_id: int, org_id: int) -> Optional[str]:
    """Get the role name for a user in an organization."""
    membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user_id)
        .filter(OrgMembership.org_id == org_id)
        .first()
    )
    if not membership:
        return None
    role = db.query(RbacRole).filter(RbacRole.id == membership.role_id).first()
    return role.name if role else None


@router.get("/orgs/{org_id}/members", response_model=List[MemberResponse])
async def list_members(
    org_id: int,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """List members of an organization."""
    # Verify membership
    require_org_membership(db, user.id, org_id)

    memberships = (
        db.query(OrgMembership)
        .filter(OrgMembership.org_id == org_id)
        .all()
    )
    responses = []
    for m in memberships:
        user_obj = db.query(User).filter(User.id == m.user_id).first()
        role = db.query(RbacRole).filter(RbacRole.id == m.role_id).first()
        responses.append(
            MemberResponse(
                user_id=user_obj.id,
                email=user_obj.email,
                name=user_obj.name,
                role=role.name if role else "unknown",
                joined_at=m.joined_at,
            )
        )
    return responses

@router.get("/orgs/{org_id}/invites", response_model=List[MemberInviteResponse])
async def list_pending_invites(
    org_id: int,
    _: None = Depends(require_permission("member.invite")),
    db: Session = Depends(get_db),
):
    """List pending invitations for an organization."""
    invites = (
        db.query(OrgInvite)
        .filter(OrgInvite.org_id == org_id)
        .filter(OrgInvite.status == InviteStatus.PENDING)
        .all()
    )
    responses = []
    for invite in invites:
        invited_by_user = db.query(User).filter(User.id == invite.invited_by_user_id).first()
        responses.append(
            MemberInviteResponse(
                id=invite.id,
                email=invite.email,
                role=invite.role.name if invite.role else "unknown",
                status=invite.status.value,
                invited_by=invited_by_user.name or invited_by_user.email if invited_by_user else None,
                created_at=invite.created_at,
                expires_at=invite.expires_at,
            )
        )
    return responses


@router.post("/orgs/{org_id}/members/invite", response_model=MemberInviteResponse)
async def invite_member(
    org_id: int,
    payload: MemberInviteRequest,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Invite a user to join the organization."""
    print(f"🔧 Invite endpoint called: org_id={org_id}, email={payload.email}, role={payload.role}, user_id={user.id}")
    
    try:
        # Verify user is member of this org
        membership = db.query(OrgMembership).filter(
            OrgMembership.user_id == user.id,
            OrgMembership.org_id == org_id
        ).first()
        
        if not membership:
            print(f"❌ User {user.id} is not member of org {org_id}")
            raise HTTPException(status_code=403, detail="You are not a member of this organization")

        # Check if user has permission to invite (ADMIN or OWNER only)
        user_role_name = membership.role.name if membership.role else "UNKNOWN"
        user_role_level = ROLE_HIERARCHY.get(user_role_name.upper(), 0)
        
        if user_role_level < ROLE_HIERARCHY["ADMIN"]:
            print(f"❌ User {user.id} role {user_role_name} cannot invite members")
            raise HTTPException(status_code=403, detail="Only admins can invite members")

        # Get role to assign
        role = db.query(RbacRole).filter(
            RbacRole.name == payload.role.upper(),
            RbacRole.org_id == org_id
        ).first()
        
        if not role:
            print(f"❌ Role {payload.role} not found for org {org_id}")
            raise HTTPException(status_code=400, detail=f"Role '{payload.role}' not found")

        # Check if user is already a member
        from app.storage.user_models import User
        existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
        if existing_user:
            # Check if already member of this org
            existing_member = db.query(OrgMembership).filter(
                OrgMembership.user_id == existing_user.id,
                OrgMembership.org_id == org_id
            ).first()
            
            if existing_member:
                print(f"❌ User {payload.email} is already a member")
                raise HTTPException(status_code=400, detail="User is already a member of this organization")

        # Check for existing pending invite
        existing_invite = db.query(OrgInvite).filter(
            OrgInvite.org_id == org_id,
            OrgInvite.email == payload.email.lower(),
            OrgInvite.status == InviteStatus.PENDING
        ).first()
        
        if existing_invite:
            print(f"❌ Invite already pending for {payload.email}")
            raise HTTPException(status_code=400, detail="An invitation is already pending for this email")

        # Create invite with 7-day expiration
        print(f"✅ Creating invite for {payload.email} with role {role.name}")
        invite = OrgInvite(
            org_id=org_id,
            email=payload.email.lower(),
            role_id=role.id,
            invited_by_user_id=user.id,
            token=OrgInvite.generate_token(),
            status=InviteStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db.add(invite)
        db.flush()

        # Audit log
        AuditService.log(
            db,
            org_id=org_id,
            actor_user_id=user.id,
            actor_type="user",
            action="member.invite",
            target_type="invite",
            target_id=invite.id,
            event_metadata={"email": payload.email, "role": role.name}
        )
        db.commit()
        print(f"✅ Invite created successfully: id={invite.id}")

        return MemberInviteResponse(
            id=invite.id,
            email=invite.email,
            role=role.name,
            status=invite.status.value,
            invited_by=user.name or user.email,
            created_at=invite.created_at,
            expires_at=invite.expires_at,
        )
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"❌ Unexpected error in invite endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/invites/{token}/accept", response_model=MemberResponse)
async def accept_invite(
    token: str,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    """Accept an invitation using the token (called by invitee after sign-in)."""
    invite = db.query(OrgInvite).filter(OrgInvite.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invite.status != InviteStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Invitation is {invite.status.value}")

    if datetime.utcnow() > invite.expires_at:
        invite.status = InviteStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    # Verify accepting user's email matches invite
    if user.email.lower() != invite.email:
        raise HTTPException(
            status_code=403,
            detail="This invitation was sent to a different email address"
        )

    # Check if user already has membership
    existing = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user.id)
        .filter(OrgMembership.org_id == invite.org_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You are already a member of this organization")

    # Create membership
    membership = OrgMembership(
        user_id=user.id,
        org_id=invite.org_id,
        role_id=invite.role_id,
    )
    db.add(membership)

    # Update invite status
    invite.status = InviteStatus.ACCEPTED
    invite.accepted_at = datetime.utcnow()
    invite.accepted_by_user_id = user.id

    # Audit log
    AuditService.log(
        db,
        org_id=invite.org_id,
        actor_user_id=user.id,
        actor_type="user",
        action="member.invite_accept",
        target_type="membership",
        target_id=membership.id,
        details={"invite_id": invite.id}
    )
    db.commit()

    role = db.query(RbacRole).filter(RbacRole.id == invite.role_id).first()
    return MemberResponse(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=role.name if role else "unknown",
        joined_at=membership.joined_at,
    )


@router.delete("/orgs/{org_id}/invites/{invite_id}")
async def cancel_invite(
    org_id: int,
    invite_id: int,
    user: User = Depends(require_authenticated_user),
    _: None = Depends(require_permission("member.invite")),
    db: Session = Depends(get_db),
):
    """Cancel a pending invitation."""
    invite = db.query(OrgInvite).filter(OrgInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invite.org_id != org_id:
        raise HTTPException(status_code=403, detail="Invitation does not belong to this organization")

    if invite.status != InviteStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot cancel invitation with status: {invite.status.value}")

    invite.status = InviteStatus.CANCELLED

    # Audit log
    AuditService.log(
        db,
        org_id=org_id,
        actor_user_id=user.id,
        actor_type="user",
        action="member.invite_cancel",
        target_type="invite",
        target_id=invite.id,
        details={"email": invite.email}
    )
    db.commit()

    return {"message": "Invitation cancelled successfully"}

@router.patch("/orgs/{org_id}/members/{user_id}", response_model=MemberResponse)
async def update_member_role(
    org_id: int,
    user_id: int,
    payload: RoleUpdateRequest,
    actor: User = Depends(require_authenticated_user),
    _: None = Depends(require_permission("member.role_update")),
    db: Session = Depends(get_db),
):
    """Update a member's role."""
    membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user_id)
        .filter(OrgMembership.org_id == org_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Check if actor can assign this role
    if not can_manage_role(db, actor.id, org_id, payload.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign a role higher than your own"
        )

    # Check if target user's current role is higher than actor's (can't demote higher-ups)
    target_current_role = db.query(RbacRole).filter(RbacRole.id == membership.role_id).first()
    if target_current_role:
        if not can_manage_role(db, actor.id, org_id, target_current_role.name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify a user with higher role than yours"
            )

    # Check for sole owner demotion protection
    new_role = db.query(RbacRole).filter(RbacRole.name == payload.role.upper()).first()
    if not new_role:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")

    if target_current_role and target_current_role.name == "OWNER":
        # Count owners
        owner_role_id = target_current_role.id
        owner_count = (
            db.query(OrgMembership)
            .filter(OrgMembership.org_id == org_id)
            .filter(OrgMembership.role_id == owner_role_id)
            .count()
        )
        if owner_count <= 1 and new_role.name != "OWNER":
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the last owner. Transfer ownership first."
            )

    old_role_name = target_current_role.name if target_current_role else "unknown"
    membership.role_id = new_role.id
    db.add(membership)

    AuditService.log(
        db,
        org_id=org_id,
        actor_user_id=actor.id,
        actor_type="user",
        action="member.role_update",
        target_type="membership",
        target_id=membership.id,
        details={"old_role": old_role_name, "new_role": new_role.name}
    )
    db.commit()

    user_obj = db.query(User).filter(User.id == user_id).first()
    return MemberResponse(
        user_id=user_obj.id,
        email=user_obj.email,
        name=user_obj.name,
        role=new_role.name,
        joined_at=membership.joined_at,
    )

@router.delete("/orgs/{org_id}/members/{user_id}")
async def remove_member(
    org_id: int,
    user_id: int,
    actor: User = Depends(require_authenticated_user),
    _: None = Depends(require_permission("member.remove")),
    db: Session = Depends(get_db),
):
    """Remove a member from an organization."""
    membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user_id)
        .filter(OrgMembership.org_id == org_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Check if target has higher role than actor (can't remove higher-ups)
    target_role = db.query(RbacRole).filter(RbacRole.id == membership.role_id).first()
    if target_role:
        if not can_manage_role(db, actor.id, org_id, target_role.name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot remove a user with higher role than yours"
            )

    # Sole owner protection
    if target_role and target_role.name == "OWNER":
        owner_count = (
            db.query(OrgMembership)
            .filter(OrgMembership.org_id == org_id)
            .filter(OrgMembership.role_id == target_role.id)
            .count()
        )
        if owner_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last owner. Transfer ownership first."
            )

    db.delete(membership)
    AuditService.log(
        db,
        org_id=org_id,
        actor_user_id=actor.id,
        actor_type="user",
        action="member.remove",
        target_type="membership",
        target_id=user_id,
    )
    db.commit()

    return {"message": "Member removed successfully"}
