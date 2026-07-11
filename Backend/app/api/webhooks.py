"""Clerk webhook endpoint for syncing organizations and users to SentinelAI database."""

import os
import hmac
import hashlib
import base64
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db
from app.services.org_sync_service import OrganizationSyncService
from app.storage.user_models import User

logger = logging.getLogger(__name__)

router = APIRouter()

# Clerk webhook signing secret (from Clerk Dashboard -> Webhooks)
CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")


def verify_svix_webhook(payload: bytes, headers: dict) -> bool:
    """Verify Svix webhook signature using HMAC-SHA256.

    Clerk uses the Svix webhook standard: headers include svix-id,
    svix-timestamp, and svix-signature.
    """
    secret = CLERK_WEBHOOK_SECRET
    if not secret:
        logger.warning("CLERK_WEBHOOK_SECRET not configured, skipping webhook verification")
        return True  # Allow in dev without secret configured

    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not all([svix_id, svix_timestamp, svix_signature]):
        logger.warning("Missing Svix headers")
        return False

    # Build signed content: "{svix_id}.{svix_timestamp}.{payload}"
    signed_content = f"{svix_id}.{svix_timestamp}.".encode() + payload

    # Secret is base64 encoded
    try:
        secret_bytes = base64.b64decode(secret)
    except Exception:
        logger.error("CLERK_WEBHOOK_SECRET is not valid base64")
        return False

    # Compute HMAC-SHA256
    expected = base64.b64encode(
        hmac.new(secret_bytes, signed_content, hashlib.sha256).digest()
    ).decode()

    # Check if expected signature is in the svix-signature header (comma-separated list)
    signatures = [s.strip() for s in svix_signature.split(" ")]
    return hmac.compare_digest(signatures[0] if signatures else "", expected)


@router.post("/webhooks/clerk")
async def clerk_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive Clerk webhook events and sync to SentinelAI database.

    Handles:
    - user.created: Create SentinelAI user record
    - organization.created: Create SentinelAI organization record
    - organizationMembership.created: Add user membership
    """
    payload = await request.body()

    if not verify_svix_webhook(payload, dict(request.headers)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("type", "")
    event_data = event.get("data", {})

    logger.info("Clerk webhook received: %s", event_type)

    try:
        if event_type == "user.created":
            _handle_user_created(event_data, db)
        elif event_type == "user.updated":
            _handle_user_updated(event_data, db)
        elif event_type == "organization.created":
            _handle_organization_created(event_data, db)
        elif event_type == "organization.updated":
            _handle_organization_updated(event_data, db)
        elif event_type == "organization.deleted":
            _handle_organization_deleted(event_data, db)
        elif event_type == "organizationMembership.created":
            _handle_membership_created(event_data, db)
        elif event_type == "organizationMembership.deleted":
            _handle_membership_deleted(event_data, db)
        else:
            logger.debug("Unhandled webhook event type: %s", event_type)

    except Exception as e:
        logger.exception("Webhook handler failed for %s: %s", event_type, e)
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok", "event": event_type}


def _handle_user_created(data: dict, db: Session):
    """Create SentinelAI user from Clerk user.created webhook."""
    clerk_user_id = data.get("id")
    email = ""
    name = None

    email_addresses = data.get("email_addresses", [])
    if email_addresses:
        email = email_addresses[0].get("email_address", "")

    first_name = data.get("first_name") or ""
    last_name = data.get("last_name") or ""
    if first_name or last_name:
        name = f"{first_name} {last_name}".strip()

    existing = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if existing:
        existing.email = email
        if name:
            existing.name = name
        db.commit()
        return

    user = User(
        clerk_user_id=clerk_user_id,
        email=email,
        name=name,
    )
    db.add(user)
    db.commit()
    logger.info("User created from webhook: %s (%s)", clerk_user_id, email)


def _handle_user_updated(data: dict, db: Session):
    """Update SentinelAI user from Clerk user.updated webhook."""
    clerk_user_id = data.get("id")
    if not clerk_user_id:
        return

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        return

    email_addresses = data.get("email_addresses", [])
    if email_addresses:
        user.email = email_addresses[0].get("email_address", user.email)

    first_name = data.get("first_name") or ""
    last_name = data.get("last_name") or ""
    if first_name or last_name:
        user.name = f"{first_name} {last_name}".strip()

    db.commit()


def _handle_organization_created(data: dict, db: Session):
    """Sync organization from Clerk organization.created webhook."""
    clerk_org_id = data.get("id")
    name = data.get("name", "")
    slug = data.get("slug", "")
    created_by = data.get("created_by", "")

    if not clerk_org_id:
        logger.warning("organization.created webhook missing org id")
        return

    OrganizationSyncService.sync_from_clerk(
        clerk_org_id=clerk_org_id,
        name=name,
        slug=slug,
        owner_clerk_user_id=created_by,
        db=db,
    )


def _handle_organization_updated(data: dict, db: Session):
    """Update organization from Clerk organization.updated webhook."""
    clerk_org_id = data.get("id")
    if not clerk_org_id:
        return

    org = OrganizationSyncService.get_organization_by_clerk_id(clerk_org_id, db)
    if not org:
        return

    name = data.get("name")
    if name:
        OrganizationSyncService.update_organization(
            org_id=org.id,
            name=name,
            db=db,
        )


def _handle_organization_deleted(data: dict, db: Session):
    """Handle organization deletion from Clerk."""
    clerk_org_id = data.get("id")
    if not clerk_org_id:
        return

    org = OrganizationSyncService.get_organization_by_clerk_id(clerk_org_id, db)
    if org:
        OrganizationSyncService.delete_organization(org_id=org.id, db=db)


def _handle_membership_created(data: dict, db: Session):
    """Sync membership from Clerk organizationMembership.created webhook."""
    clerk_org_id = None
    clerk_user_id = None
    role = None

    org_data = data.get("organization", {})
    user_data = data.get("user", {})

    clerk_org_id = org_data.get("id")
    clerk_user_id = user_data.get("id")
    role = data.get("role") or data.get("permissions", "")

    if not clerk_org_id or not clerk_user_id:
        logger.warning("membership.created webhook missing org or user id")
        return

    org = OrganizationSyncService.get_organization_by_clerk_id(clerk_org_id, db)
    if not org:
        logger.warning("Organization not found for membership: %s", clerk_org_id)
        return

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        logger.warning("User not found for membership: %s", clerk_user_id)
        return

    # Check if membership already exists
    from app.storage.org_models import OrgMembership, Organization

    existing = db.query(OrgMembership).filter(
        OrgMembership.user_id == user.id,
        OrgMembership.org_id == org.id,
    ).first()

    if existing:
        return

    # Find the admin role
    from app.storage.rbac_models import RbacRole

    admin_role = db.query(RbacRole).filter(
        RbacRole.name == role.upper() if role else "ADMIN",
        RbacRole.org_id == org.id,
    ).first()

    if not admin_role:
        admin_role = db.query(RbacRole).filter(
            RbacRole.name == "ADMIN",
            RbacRole.org_id.is_(None),
        ).first()

    if not admin_role:
        logger.warning("No suitable role found for membership")
        return

    membership = OrgMembership(
        user_id=user.id,
        org_id=org.id,
        role_id=admin_role.id,
    )
    db.add(membership)
    db.commit()
    logger.info("Membership created: user=%s org=%s role=%s", clerk_user_id, clerk_org_id, role)


def _handle_membership_deleted(data: dict, db: Session):
    """Remove membership from Clerk organizationMembership.deleted webhook."""
    clerk_org_id = None
    clerk_user_id = None

    org_data = data.get("organization", {})
    user_data = data.get("user", {})

    clerk_org_id = org_data.get("id")
    clerk_user_id = user_data.get("id")

    if not clerk_org_id or not clerk_user_id:
        return

    org = OrganizationSyncService.get_organization_by_clerk_id(clerk_org_id, db)
    if not org:
        return

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        return

    from app.storage.org_models import OrgMembership

    membership = db.query(OrgMembership).filter(
        OrgMembership.user_id == user.id,
        OrgMembership.org_id == org.id,
    ).first()

    if membership:
        db.delete(membership)
        db.commit()
        logger.info("Membership removed: user=%s org=%s", clerk_user_id, clerk_org_id)
