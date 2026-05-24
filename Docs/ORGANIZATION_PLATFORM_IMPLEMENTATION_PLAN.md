# Organization Platform: Enterprise Production Hardening Plan

**Document Version:** 1.0  
**Date:** May 22, 2026  
**Current State:** Org platform has foundational models, APIs, and RBAC; feature completeness is 30–50% for production use.

---

## Executive Summary

The SentinelAI Organization Platform has core infrastructure (org/workspace models, member invites, RBAC, audit logging). However, production-grade features are incomplete: invite delivery, exhaustive tenancy enforcement, per-org API key management, SSO/enterprise auth, and observability/quotas are missing or partial.

**Total estimated effort:** 8–12 weeks (4–5 engineers, phased delivery).  
**Recommended sequencing:** Invite delivery + tenancy audit (weeks 1–3) → API key lifecycle (weeks 3–4) → SSO (weeks 5–8) → observability/quotas (weeks 8–12).

---

## Priority 1: Invite Delivery + Retry System

**Current State:** `OrgInvite` model exists; token generation works. No email delivery, retry logic, or UI for acceptance flow.

**Effort:** 3–4 weeks (1 BE engineer, 0.5 FE engineer).

### Database Schema Changes

#### Migration: Add Invite Delivery Tracking

```sql
-- Backend/app/storage/invite_models.py (add columns and new model)

ALTER TABLE org_invites ADD COLUMN (
    delivery_status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed, bounced
    delivery_attempts INT DEFAULT 0,
    last_delivery_attempt TIMESTAMP NULL,
    next_retry_at TIMESTAMP NULL,
    recipient_email VARCHAR(255) NOT NULL,  -- explicit email (separate from user invitation)
    accepted_at TIMESTAMP NULL,
    declined_at TIMESTAMP NULL
);

ALTER TABLE org_invites ADD INDEX idx_delivery_status (delivery_status);
ALTER TABLE org_invites ADD INDEX idx_next_retry (next_retry_at);
```

#### Updated SQLAlchemy Model

```python
# Backend/app/storage/invite_models.py

from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, DateTime, Enum
import enum

class InviteDeliveryStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"

class OrgInvite(Base):
    __tablename__ = "org_invites"
    
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    email = Column(String(255), nullable=False)  # recipient email
    token = Column(String(255), unique=True, nullable=False)
    role_id = Column(Integer, ForeignKey("rbac_roles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    
    # Delivery tracking (NEW)
    delivery_status = Column(Enum(InviteDeliveryStatus), default=InviteDeliveryStatus.PENDING)
    delivery_attempts = Column(Integer, default=0)
    last_delivery_attempt = Column(DateTime, nullable=True)
    next_retry_at = Column(DateTime, nullable=True)
    recipient_email = Column(String(255), nullable=False)  # explicit
    accepted_at = Column(DateTime, nullable=True)
    declined_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization", backref="invites")
    role = relationship("RbacRole")
    
    def schedule_retry(self, delay_minutes: int = 30):
        """Schedule next retry with exponential backoff (30min, 2h, 8h, 24h)."""
        self.delivery_attempts += 1
        backoff = min(delay_minutes * (2 ** (self.delivery_attempts - 1)), 1440)  # cap at 24h
        self.next_retry_at = datetime.utcnow() + timedelta(minutes=backoff)
```

### Backend: Email Service + Job Queue

#### New Service: `InviteService`

```python
# Backend/app/services/invite_service.py

from typing import Optional
from datetime import datetime
from app.storage.invite_models import OrgInvite, InviteDeliveryStatus
from app.storage.org_models import Organization
from app.core.email import EmailClient
from app.core.job_queue import JobQueue
from app.auth.dependencies import get_session
from sqlalchemy.orm import Session

class InviteService:
    """Manages org invite lifecycle: creation, delivery, acceptance, audit."""
    
    def __init__(self, db: Session, email_client: EmailClient, job_queue: JobQueue):
        self.db = db
        self.email_client = email_client
        self.job_queue = job_queue
    
    def create_invite(
        self,
        org_id: int,
        email: str,
        role_id: Optional[int] = None,
        expires_in_days: int = 7
    ) -> OrgInvite:
        """Create invite and enqueue delivery."""
        from app.storage.invite_models import OrgInvite
        import secrets
        
        org = self.db.query(Organization).filter_by(id=org_id).first()
        if not org:
            raise ValueError(f"Organization {org_id} not found")
        
        invite = OrgInvite(
            org_id=org_id,
            email=email,
            recipient_email=email,
            token=secrets.token_urlsafe(32),
            role_id=role_id,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days),
            delivery_status=InviteDeliveryStatus.PENDING
        )
        self.db.add(invite)
        self.db.commit()
        
        # Enqueue delivery job
        self.job_queue.enqueue(
            "send_invite_email",
            invite_id=invite.id,
            org_id=org_id,
            email=email,
            token=invite.token,
            org_name=org.name
        )
        
        # Audit log
        from app.services.audit_service import AuditService
        audit = AuditService(self.db)
        audit.log(
            org_id=org_id,
            event="invite.created",
            actor_id=None,  # system
            details={"email": email, "role_id": role_id}
        )
        
        return invite
    
    def accept_invite(self, token: str, user_id: int) -> OrgInvite:
        """Accept invite: validate, create membership, audit."""
        invite = self.db.query(OrgInvite).filter_by(token=token).first()
        if not invite:
            raise ValueError("Invalid invite token")
        
        if invite.expires_at < datetime.utcnow():
            raise ValueError("Invite has expired")
        
        if invite.accepted_at or invite.declined_at:
            raise ValueError("Invite already processed")
        
        # Create membership
        from app.storage.org_models import OrgMembership
        membership = OrgMembership(
            org_id=invite.org_id,
            user_id=user_id,
            role_id=invite.role_id,
            joined_at=datetime.utcnow()
        )
        self.db.add(membership)
        
        # Mark invite as accepted
        invite.accepted_at = datetime.utcnow()
        invite.delivery_status = InviteDeliveryStatus.SENT  # mark delivery success
        self.db.commit()
        
        # Audit
        audit = AuditService(self.db)
        audit.log(
            org_id=invite.org_id,
            event="invite.accepted",
            actor_id=user_id,
            details={"invite_id": invite.id}
        )
        
        return invite
    
    def send_invite_email(self, invite_id: int) -> bool:
        """Background job: send invite email with retry on failure."""
        invite = self.db.query(OrgInvite).filter_by(id=invite_id).first()
        if not invite:
            return False
        
        org = self.db.query(Organization).filter_by(id=invite.org_id).first()
        
        try:
            # Build email
            accept_link = f"https://app.sentinelai.com/org/invite/{invite.token}/accept"
            template_vars = {
                "org_name": org.name,
                "accept_link": accept_link,
                "expires_in_days": 7
            }
            
            self.email_client.send(
                to=invite.recipient_email,
                template="org_invite",
                variables=template_vars
            )
            
            invite.delivery_status = InviteDeliveryStatus.SENT
            invite.last_delivery_attempt = datetime.utcnow()
            self.db.commit()
            
            return True
        except Exception as e:
            # Schedule retry
            invite.last_delivery_attempt = datetime.utcnow()
            invite.schedule_retry()
            self.db.commit()
            
            # Log failure (don't block)
            print(f"Failed to send invite {invite_id}: {str(e)}")
            return False
```

#### Email Service: SMTP/SES Integration

```python
# Backend/app/core/email.py

from abc import ABC, abstractmethod
from typing import Dict, Any
import smtplib
import boto3
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

class EmailClient(ABC):
    @abstractmethod
    def send(self, to: str, template: str, variables: Dict[str, Any]) -> bool:
        pass

class SMTPEmailClient(EmailClient):
    """SMTP-based email (dev/staging)."""
    
    def __init__(self, host: str, port: int, user: str, password: str, from_email: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.from_email = from_email
        self.templates = {
            "org_invite": self._template_org_invite
        }
    
    def send(self, to: str, template: str, variables: Dict[str, Any]) -> bool:
        try:
            template_fn = self.templates.get(template)
            if not template_fn:
                raise ValueError(f"Unknown template: {template}")
            
            subject, body = template_fn(variables)
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to
            msg.attach(MIMEText(body, "html"))
            
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.from_email, [to], msg.as_string())
            
            return True
        except Exception as e:
            print(f"SMTP error: {e}")
            return False
    
    @staticmethod
    def _template_org_invite(vars: Dict[str, Any]) -> tuple:
        subject = f"You're invited to join {vars['org_name']} on SentinelAI"
        body = f"""
        <html>
          <body>
            <h2>Join {vars['org_name']} on SentinelAI</h2>
            <p>You have been invited to join the organization <strong>{vars['org_name']}</strong>.</p>
            <p><a href="{vars['accept_link']}">Accept Invite</a></p>
            <p>This invite expires in {vars['expires_in_days']} days.</p>
          </body>
        </html>
        """
        return subject, body

class SESEmailClient(EmailClient):
    """AWS SES-based email (production)."""
    
    def __init__(self, region: str, from_email: str):
        self.ses = boto3.client("ses", region_name=region)
        self.from_email = from_email
        self.templates = {
            "org_invite": self._template_org_invite
        }
    
    def send(self, to: str, template: str, variables: Dict[str, Any]) -> bool:
        try:
            template_fn = self.templates.get(template)
            if not template_fn:
                raise ValueError(f"Unknown template: {template}")
            
            subject, body = template_fn(variables)
            
            self.ses.send_email(
                Source=self.from_email,
                Destination={"ToAddresses": [to]},
                Message={
                    "Subject": {"Data": subject},
                    "Body": {"Html": {"Data": body}}
                }
            )
            
            return True
        except Exception as e:
            print(f"SES error: {e}")
            return False
    
    @staticmethod
    def _template_org_invite(vars: Dict[str, Any]) -> tuple:
        subject = f"You're invited to join {vars['org_name']} on SentinelAI"
        body = f"""
        <html>
          <body>
            <h2>Join {vars['org_name']} on SentinelAI</h2>
            <p>You have been invited to join the organization <strong>{vars['org_name']}</strong>.</p>
            <p><a href="{vars['accept_link']}">Accept Invite</a></p>
            <p>This invite expires in {vars['expires_in_days']} days.</p>
          </body>
        </html>
        """
        return subject, body
```

#### Background Job Queue (Redis + Celery or RQ)

```python
# Backend/app/core/job_queue.py

from typing import Any, Dict
import redis
from rq import Queue, Worker
import json

class JobQueue:
    """Wrapper around Redis Queue (RQ) for async job processing."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_conn = redis.from_url(redis_url)
        self.queue = Queue(connection=self.redis_conn)
    
    def enqueue(self, job_name: str, **kwargs) -> str:
        """Enqueue a job (e.g., 'send_invite_email')."""
        job = self.queue.enqueue(
            f"app.jobs.{job_name}",
            **kwargs
        )
        return job.id

# Backend/app/jobs.py

from app.storage.db import SessionLocal
from app.services.invite_service import InviteService
from app.core.email import get_email_client  # dependency injection
import logging

logger = logging.getLogger(__name__)

def send_invite_email(invite_id: int, org_id: int, email: str, token: str, org_name: str):
    """RQ job: send invite email and update status."""
    db = SessionLocal()
    try:
        email_client = get_email_client()
        service = InviteService(db, email_client, None)
        service.send_invite_email(invite_id)
    except Exception as e:
        logger.exception(f"Job send_invite_email failed for invite {invite_id}: {e}")
    finally:
        db.close()
```

### Backend: API Endpoints

#### Update: `POST /orgs/{org_id}/members/invite`

```python
# Backend/app/api/members_routes.py (add/update)

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.services.invite_service import InviteService
from app.auth.dependencies import require_authenticated_user, UserInRequest

router = APIRouter(prefix="/orgs/{org_id}/members")

class InviteRequest(BaseModel):
    email: EmailStr
    role_id: int

@router.post("/invite", status_code=202)
def create_invite(
    org_id: int,
    body: InviteRequest,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Create and enqueue invite. Requires org.manage permission."""
    # Check org membership and permission
    org = db.query(Organization).filter_by(id=org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify permission (org.manage)
    from app.rbac.enforce import require_permission
    require_permission(user.id, org_id, "org.manage", db)
    
    # Check for existing membership
    existing = db.query(OrgMembership).filter_by(
        org_id=org_id, user_id=???  # Lookup user by email? Or require existing user?
    ).first()
    
    email_client = get_email_client()
    job_queue = get_job_queue()
    service = InviteService(db, email_client, job_queue)
    
    invite = service.create_invite(
        org_id=org_id,
        email=body.email,
        role_id=body.role_id,
        expires_in_days=7
    )
    
    return {
        "invite_id": invite.id,
        "email": invite.recipient_email,
        "status": "queued",
        "expires_at": invite.expires_at.isoformat()
    }

@router.post("/invite/{token}/accept", status_code=200)
def accept_invite(
    org_id: int,
    token: str,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Accept invite and create membership."""
    email_client = get_email_client()
    job_queue = get_job_queue()
    service = InviteService(db, email_client, job_queue)
    
    invite = service.accept_invite(token, user.id)
    
    return {
        "org_id": invite.org_id,
        "membership_created": True,
        "role_id": invite.role_id
    }

@router.get("/invites", status_code=200)
def list_pending_invites(
    org_id: int,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """List pending invites for org (admin only)."""
    require_permission(user.id, org_id, "org.manage", db)
    
    invites = db.query(OrgInvite).filter(
        OrgInvite.org_id == org_id,
        OrgInvite.accepted_at == None,
        OrgInvite.declined_at == None
    ).all()
    
    return [
        {
            "id": i.id,
            "email": i.recipient_email,
            "status": i.delivery_status.value,
            "created_at": i.created_at.isoformat(),
            "expires_at": i.expires_at.isoformat(),
            "delivery_attempts": i.delivery_attempts
        }
        for i in invites
    ]

@router.delete("/invite/{invite_id}", status_code=204)
def cancel_invite(
    org_id: int,
    invite_id: int,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Cancel pending invite."""
    require_permission(user.id, org_id, "org.manage", db)
    
    invite = db.query(OrgInvite).filter_by(id=invite_id, org_id=org_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    db.delete(invite)
    db.commit()
    
    return None
```

### Frontend: Invite Acceptance Flow

#### New Page: `/org/invite/[token]/accept`

```typescript
// Frontend/app/org/invite/[token]/accept/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function AcceptInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      // Redirect to sign in
      router.push(`/auth/sign-in?redirect_url=/org/invite/${params.token}/accept`);
      return;
    }

    const acceptInvite = async () => {
      try {
        const response = await fetch("/api/orgs/0/members/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: params.token }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.detail || "Failed to accept invite");
          return;
        }

        const data = await response.json();
        setOrgName(data.org_name);

        // Redirect to org dashboard after 2 seconds
        setTimeout(() => {
          router.push(`/org/${data.org_id}/dashboard`);
        }, 2000);
      } catch (err: any) {
        setError(err.message || "Network error");
      } finally {
        setLoading(false);
      }
    };

    acceptInvite();
  }, [userId, params.token, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-black">
      <div className="text-center">
        {loading && (
          <>
            <h1 className="text-2xl font-bold text-white mb-4">
              Accepting invite...
            </h1>
            <div className="spinner" />
          </>
        )}
        {error && (
          <div className="bg-red-900 text-white p-4 rounded">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Go Home
            </button>
          </div>
        )}
        {!loading && !error && (
          <div className="bg-green-900 text-white p-4 rounded">
            <p className="text-xl font-semibold">Welcome to {orgName}!</p>
            <p>Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Update: Organization Settings Page (add Invite Management UI)

```typescript
// Frontend/app/org/[orgId]/dashboard/settings/members/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function MembersPage({ params }: { params: { orgId: string } }) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, [params.orgId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/orgs/${params.orgId}/members`);
      const data = await res.json();
      setMembers(data.members);
    } catch (err) {
      setError("Failed to load members");
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch(`/api/orgs/${params.orgId}/members/invites`);
      const data = await res.json();
      setInvites(data.invites);
    } catch (err) {
      console.error("Failed to load invites");
    }
  };

  const handleInvite = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${params.orgId}/members/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role_id: role }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail);
        return;
      }

      setEmail("");
      setRole("VIEWER");
      await fetchInvites();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    try {
      await fetch(`/api/orgs/${params.orgId}/members/invite/${inviteId}`, {
        method: "DELETE",
      });
      await fetchInvites();
    } catch (err) {
      setError("Failed to cancel invite");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Members</h1>

      {/* Invite form */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Send Invite</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="VIEWER">Viewer</option>
            <option value="DEVELOPER">Developer</option>
            <option value="ADMIN">Admin</option>
            <option value="OWNER">Owner</option>
          </Select>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? "Sending..." : "Send Invite"}
          </Button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Pending invites */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Pending Invites</h2>
        <table className="w-full text-sm text-slate-300">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Sent</th>
              <th className="text-left py-2">Expires</th>
              <th className="text-left py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite: any) => (
              <tr key={invite.id} className="border-b border-slate-700">
                <td className="py-2">{invite.email}</td>
                <td className="py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      invite.status === "sent"
                        ? "bg-green-900 text-green-200"
                        : "bg-yellow-900 text-yellow-200"
                    }`}
                  >
                    {invite.status}
                  </span>
                </td>
                <td className="py-2">{new Date(invite.created_at).toLocaleDateString()}</td>
                <td className="py-2">{new Date(invite.expires_at).toLocaleDateString()}</td>
                <td className="py-2">
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Existing members */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Members</h2>
        <table className="w-full text-sm text-slate-300">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Role</th>
              <th className="text-left py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member: any) => (
              <tr key={member.id} className="border-b border-slate-700">
                <td className="py-2">{member.name}</td>
                <td className="py-2">{member.email}</td>
                <td className="py-2">{member.role}</td>
                <td className="py-2">{new Date(member.joined_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Testing

#### Unit Tests: Invite Service

```python
# Backend/tests/test_invite_service.py

import pytest
from datetime import datetime, timedelta
from app.services.invite_service import InviteService
from app.storage.invite_models import OrgInvite, InviteDeliveryStatus
from app.core.email import MockEmailClient
from app.core.job_queue import MockJobQueue
from app.storage.db import SessionLocal

@pytest.fixture
def service():
    db = SessionLocal()
    email = MockEmailClient()
    queue = MockJobQueue()
    return InviteService(db, email, queue), db

def test_create_invite(service):
    svc, db = service
    invite = svc.create_invite(org_id=1, email="user@example.com", role_id=2)
    
    assert invite.org_id == 1
    assert invite.recipient_email == "user@example.com"
    assert invite.delivery_status == InviteDeliveryStatus.PENDING
    assert invite.token is not None

def test_accept_invite(service):
    svc, db = service
    invite = svc.create_invite(org_id=1, email="user@example.com", role_id=2)
    token = invite.token
    
    svc.accept_invite(token, user_id=10)
    
    # Reload and check
    invite = db.query(OrgInvite).filter_by(token=token).first()
    assert invite.accepted_at is not None

def test_accept_expired_invite(service):
    svc, db = service
    invite = svc.create_invite(org_id=1, email="user@example.com", role_id=2)
    
    # Manually expire
    invite.expires_at = datetime.utcnow() - timedelta(days=1)
    db.commit()
    
    with pytest.raises(ValueError, match="expired"):
        svc.accept_invite(invite.token, user_id=10)

def test_send_invite_email_retry(service):
    svc, db = service
    invite = svc.create_invite(org_id=1, email="user@example.com", role_id=2)
    
    # First send succeeds
    assert svc.send_invite_email(invite.id) == True
    
    # Check status
    invite = db.query(OrgInvite).filter_by(id=invite.id).first()
    assert invite.delivery_status == InviteDeliveryStatus.SENT
    assert invite.delivery_attempts == 1
```

#### E2E Tests: Invite Flow

```python
# Backend/tests/e2e/test_invite_flow.py

def test_complete_invite_flow(client, db):
    """E2E: Org admin invites user → email queued → user accepts → membership created."""
    
    # 1. Admin creates org
    resp = client.post("/api/orgs", json={"name": "Test Org"}, headers={"Authorization": f"Bearer {admin_token}"})
    org_id = resp.json()["id"]
    
    # 2. Admin sends invite
    resp = client.post(
        f"/api/orgs/{org_id}/members/invite",
        json={"email": "newuser@example.com", "role_id": 2},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 202
    invite_data = resp.json()
    invite_token = invite_data["token"]
    
    # 3. Email job was queued (verify in mock queue)
    # (In real tests, poll job queue or mock SES)
    
    # 4. New user signs up and accepts invite
    resp = client.post(
        f"/api/orgs/{org_id}/members/invite/{invite_token}/accept",
        headers={"Authorization": f"Bearer {new_user_token}"}
    )
    assert resp.status_code == 200
    
    # 5. Verify membership created
    resp = client.get(f"/api/orgs/{org_id}/members", headers={"Authorization": f"Bearer {admin_token}"})
    members = resp.json()["members"]
    assert any(m["email"] == "newuser@example.com" for m in members)
```

---

## Priority 2: Exhaustive Tenancy + RBAC Audit

**Current State:** Tenancy helpers exist (`resolve_org_from_request`, `require_org_membership`) but are not comprehensively applied. RBAC enforcement scattered.

**Effort:** 2–3 weeks (1 BE engineer).

### Scope

**Audit all endpoints in `Backend/app/api/`:**
- Check every route for `@require_authenticated_user`, `@require_org_membership`, and permission enforcement.
- Scan for cross-org data leaks (e.g., listing users without org filter).
- Verify audit logging is applied to sensitive actions.

### Audit Checklist

Create [Backend/TENANCY_AUDIT.md](Backend/TENANCY_AUDIT.md):

```markdown
# Tenancy & RBAC Audit Checklist

## Standards
- Every org-scoped endpoint **must** call `require_org_membership(user_id, org_id, db)`.
- Every sensitive action **must** check `require_permission(user_id, org_id, permission, db)`.
- All DB queries **must** filter by `org_id` (no cross-org leaks).
- All mutations **must** log to `AuditService.log()`.

## Endpoints to Audit

### Org Management (`orgs_routes.py`)
- [ ] `POST /orgs` — requires auth; creates with user as owner
- [ ] `GET /orgs` — requires auth; filters by user's memberships
- [ ] `GET /orgs/{org_id}` — requires org membership
- [ ] `PUT /orgs/{org_id}` — requires `org.manage`
- [ ] `DELETE /orgs/{org_id}` — requires sole owner + audit
- [ ] `GET /orgs/{org_id}/risk-logs` — requires `org.view`
- [ ] `GET /orgs/{org_id}/baselines` — requires `org.view`
- [ ] `POST /orgs/{org_id}/baselines` — requires `org.manage` + audit
- [ ] `PUT /orgs/{org_id}/baselines` — requires `org.manage` + audit

### Members (`members_routes.py`)
- [ ] `GET /orgs/{org_id}/members` — requires org membership
- [ ] `POST /orgs/{org_id}/members/invite` — requires `org.manage` + audit
- [ ] `GET /orgs/{org_id}/members/invites` — requires `org.manage`
- [ ] `POST /orgs/{org_id}/members/invite/{token}/accept` — auth only; creates membership
- [ ] `DELETE /orgs/{org_id}/members/{user_id}` — requires `org.manage`; sole owner check + audit
- [ ] `PUT /orgs/{org_id}/members/{user_id}/role` — requires `org.manage` + audit
- [ ] `POST /orgs/{org_id}/members/{user_id}/remove` — requires `org.manage`; audit

### Workspaces (`workspaces_routes.py`)
- [ ] `POST /workspaces` — requires `org.workspace.create`
- [ ] `GET /workspaces` — requires org membership; filtered by org_id
- [ ] `GET /workspaces/{workspace_id}` — requires workspace membership
- [ ] `DELETE /workspaces/{workspace_id}` — requires `workspace.admin` + audit
- [ ] ...

### API Keys (`api_keys_routes.py`)
- [ ] `POST /orgs/{org_id}/api-keys` — requires auth + `org.api-key.manage`
- [ ] `GET /orgs/{org_id}/api-keys` — requires auth + `org.api-key.view`
- [ ] `DELETE /orgs/{org_id}/api-keys/{key_id}` — requires `org.api-key.manage` + audit
- [ ] ...

## Results
- **Total endpoints:** XX
- **Compliant:** XX
- **Missing tenancy check:** XX
- **Missing permission check:** XX
- **Missing audit log:** XX
- **High-risk issues:** XX (document separately)
```

### Enforcement Pattern

Create a reusable decorator/helper:

```python
# Backend/app/rbac/tenancy_enforcer.py

from functools import wraps
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.auth.dependencies import UserInRequest, get_db
from app.storage.org_models import Organization, OrgMembership
from app.services.audit_service import AuditService

def require_org_scope(org_id_param: str = "org_id", permission: str = None):
    """
    Decorator to enforce org membership + optional permission.
    
    Usage:
      @require_org_scope("org_id", permission="org.manage")
      def update_org(org_id: int, user: UserInRequest, db: Session):
          ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user: UserInRequest = Depends(get_db), db: Session = Depends(get_db), **kwargs):
            # Extract org_id from kwargs or args (first positional)
            org_id = kwargs.get(org_id_param) or (args[0] if args else None)
            
            if not org_id:
                raise HTTPException(status_code=400, detail=f"Missing {org_id_param}")
            
            # Check membership
            membership = db.query(OrgMembership).filter_by(
                org_id=org_id,
                user_id=user.id
            ).first()
            
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not a member of this organization"
                )
            
            # Check permission if specified
            if permission:
                from app.rbac.permissions import role_has_permission
                if not role_has_permission(membership.role_id, permission, db):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing permission: {permission}"
                    )
            
            # Audit (optional, for sensitive operations)
            # audit = AuditService(db)
            # audit.log(org_id, event="...", actor_id=user.id, details={...})
            
            return await func(*args, user=user, db=db, **kwargs)
        
        return wrapper
    return decorator
```

### Test Cases

```python
# Backend/tests/test_tenancy_enforcement.py

@pytest.mark.parametrize("endpoint,method,data", [
    ("/orgs/1/members", "GET", None),
    ("/orgs/1/members/invite", "POST", {"email": "test@example.com"}),
    ("/orgs/1/baselines", "GET", None),
    ("/workspaces?org_id=1", "GET", None),
])
def test_cross_org_access_denied(client, endpoint, method, data):
    """Verify user from Org B cannot access Org A's resources."""
    org_a_user_token = create_user_in_org(1)
    org_b_user_token = create_user_in_org(2)
    
    # User B tries to access Org A
    resp = client.request(
        method,
        endpoint,
        json=data,
        headers={"Authorization": f"Bearer {org_b_user_token}"}
    )
    
    assert resp.status_code == 403

def test_permission_enforcement():
    """Verify role-based permission check."""
    viewer_token = create_user_with_role(org_id=1, role="VIEWER")
    
    # Viewer tries to delete org (requires org.manage)
    resp = client.delete("/orgs/1", headers={"Authorization": f"Bearer {viewer_token}"})
    assert resp.status_code == 403
    
    # Admin can delete
    admin_token = create_user_with_role(org_id=1, role="ADMIN")
    resp = client.delete("/orgs/1", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 204
```

---

## Priority 3: Per-Org API Key Lifecycle

**Current State:** Legacy API key admin endpoints exist. No per-org key management, no rotation, no scoping.

**Effort:** 2–3 weeks (1 BE engineer, 0.5 FE).

### Database Schema

```sql
ALTER TABLE api_keys ADD COLUMN (
    org_id INT NOT NULL,
    scopes VARCHAR(500),  -- comma-separated or JSON: ["detection.read", "baseline.write"]
    rotated_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL
);

ALTER TABLE api_keys ADD INDEX idx_org_id (org_id);
ALTER TABLE api_keys ADD FOREIGN KEY (org_id) REFERENCES organizations(id);

-- Audit API key usage
CREATE TABLE api_key_usage_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key_id INT NOT NULL,
    org_id INT NOT NULL,
    action VARCHAR(100),  -- 'get_detections', 'list_risks', etc.
    status_code INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    INDEX idx_api_key (api_key_id),
    INDEX idx_timestamp (timestamp)
);
```

### API Service

```python
# Backend/app/services/api_key_service.py

from datetime import datetime, timedelta
import secrets
from sqlalchemy.orm import Session
from app.storage.api_key_models import APIKey
from app.services.audit_service import AuditService

class APIKeyService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService(db)
    
    def create_api_key(
        self,
        org_id: int,
        name: str,
        scopes: list[str],
        expires_in_days: int = 365
    ) -> dict:
        """Create org-scoped API key."""
        key = APIKey(
            org_id=org_id,
            name=name,
            key=secrets.token_urlsafe(32),
            scopes=",".join(scopes),
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days)
        )
        self.db.add(key)
        self.db.commit()
        
        self.audit.log(
            org_id=org_id,
            event="api_key.created",
            actor_id=None,  # would be user_id in context
            details={"key_id": key.id, "name": name, "scopes": scopes}
        )
        
        return {
            "id": key.id,
            "key": key.key,  # return once; hash on DB
            "name": key.name,
            "scopes": scopes,
            "expires_at": key.expires_at.isoformat()
        }
    
    def rotate_api_key(self, org_id: int, key_id: int) -> dict:
        """Revoke old key, issue new one."""
        key = self.db.query(APIKey).filter_by(id=key_id, org_id=org_id).first()
        if not key:
            raise ValueError("API key not found")
        
        new_key = APIKey(
            org_id=org_id,
            name=f"{key.name} (rotated)",
            key=secrets.token_urlsafe(32),
            scopes=key.scopes,
            rotated_from=key_id,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=365)
        )
        self.db.add(new_key)
        
        # Mark old key as revoked
        key.revoked_at = datetime.utcnow()
        self.db.commit()
        
        self.audit.log(
            org_id=org_id,
            event="api_key.rotated",
            details={"old_key_id": key_id, "new_key_id": new_key.id}
        )
        
        return {
            "id": new_key.id,
            "key": new_key.key,
            "created_at": new_key.created_at.isoformat(),
            "expires_at": new_key.expires_at.isoformat()
        }
    
    def list_api_keys(self, org_id: int, include_revoked: bool = False):
        """List active API keys for org."""
        query = self.db.query(APIKey).filter_by(org_id=org_id)
        if not include_revoked:
            query = query.filter(APIKey.revoked_at == None)
        
        return [
            {
                "id": k.id,
                "name": k.name,
                "scopes": k.scopes.split(","),
                "created_at": k.created_at.isoformat(),
                "expires_at": k.expires_at.isoformat(),
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None
            }
            for k in query.all()
        ]
    
    def revoke_api_key(self, org_id: int, key_id: int):
        """Revoke API key (immediate)."""
        key = self.db.query(APIKey).filter_by(id=key_id, org_id=org_id).first()
        if not key:
            raise ValueError("API key not found")
        
        key.revoked_at = datetime.utcnow()
        self.db.commit()
        
        self.audit.log(
            org_id=org_id,
            event="api_key.revoked",
            details={"key_id": key_id}
        )
```

### API Endpoints

```python
# Backend/app/api/api_keys_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from app.auth.dependencies import require_authenticated_user, UserInRequest, get_db
from app.services.api_key_service import APIKeyService
from sqlalchemy.orm import Session

router = APIRouter(prefix="/orgs/{org_id}/api-keys")

class CreateAPIKeyRequest(BaseModel):
    name: str
    scopes: List[str]  # e.g., ["detection.read", "baseline.write"]
    expires_in_days: int = 365

@router.post("", status_code=201)
def create_api_key(
    org_id: int,
    body: CreateAPIKeyRequest,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Create org-scoped API key."""
    from app.rbac.enforce import require_permission
    require_permission(user.id, org_id, "org.api-key.manage", db)
    
    service = APIKeyService(db)
    key_data = service.create_api_key(
        org_id=org_id,
        name=body.name,
        scopes=body.scopes,
        expires_in_days=body.expires_in_days
    )
    
    return key_data

@router.get("", status_code=200)
def list_api_keys(
    org_id: int,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """List API keys for org."""
    from app.rbac.enforce import require_permission
    require_permission(user.id, org_id, "org.api-key.view", db)
    
    service = APIKeyService(db)
    keys = service.list_api_keys(org_id)
    
    return {"keys": keys}

@router.post("/{key_id}/rotate", status_code=200)
def rotate_api_key(
    org_id: int,
    key_id: int,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Rotate API key (revoke old, issue new)."""
    from app.rbac.enforce import require_permission
    require_permission(user.id, org_id, "org.api-key.manage", db)
    
    service = APIKeyService(db)
    new_key = service.rotate_api_key(org_id, key_id)
    
    return new_key

@router.delete("/{key_id}", status_code=204)
def revoke_api_key(
    org_id: int,
    key_id: int,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Revoke API key."""
    from app.rbac.enforce import require_permission
    require_permission(user.id, org_id, "org.api-key.manage", db)
    
    service = APIKeyService(db)
    service.revoke_api_key(org_id, key_id)
    
    return None
```

### Frontend: API Key Management

```typescript
// Frontend/app/org/[orgId]/dashboard/settings/api-keys/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const SCOPES = [
  { id: "detection.read", label: "Read Detections" },
  { id: "detection.write", label: "Write Detections" },
  { id: "baseline.read", label: "Read Baselines" },
  { id: "baseline.write", label: "Modify Baselines" },
  { id: "org.read", label: "Read Org Info" },
  { id: "org.write", label: "Modify Org" },
];

export default function APIKeysPage({ params }: { params: { orgId: string } }) {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, [params.orgId]);

  const fetchKeys = async () => {
    const res = await fetch(`/api/orgs/${params.orgId}/api-keys`);
    const data = await res.json();
    setKeys(data.keys);
  };

  const handleCreateKey = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${params.orgId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setName("");
        setScopes([]);
        await fetchKeys();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRotateKey = async (keyId: number) => {
    const res = await fetch(`/api/orgs/${params.orgId}/api-keys/${keyId}/rotate`, {
      method: "POST",
    });

    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key);
      await fetchKeys();
    }
  };

  const handleRevokeKey = async (keyId: number) => {
    await fetch(`/api/orgs/${params.orgId}/api-keys/${keyId}`, {
      method: "DELETE",
    });
    await fetchKeys();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">API Keys</h1>

      {/* New key created */}
      {newKey && (
        <div className="bg-green-900 border border-green-700 p-4 rounded">
          <p className="text-white font-semibold mb-2">API Key Created</p>
          <code className="bg-black p-2 rounded block text-sm text-green-200 mb-2">
            {newKey}
          </code>
          <p className="text-xs text-green-300">
            Save this key securely. You won't see it again!
          </p>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-sm text-green-300 hover:text-green-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create key form */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Create API Key</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Name</label>
            <Input
              placeholder="e.g., Production API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Permissions</label>
            <div className="space-y-2">
              {SCOPES.map((scope) => (
                <label key={scope.id} className="flex items-center text-slate-300">
                  <Checkbox
                    checked={scopes.includes(scope.id)}
                    onChange={(checked) =>
                      setScopes(
                        checked
                          ? [...scopes, scope.id]
                          : scopes.filter((s) => s !== scope.id)
                      )
                    }
                  />
                  <span className="ml-2 text-sm">{scope.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={handleCreateKey} disabled={!name || scopes.length === 0 || loading}>
            {loading ? "Creating..." : "Create Key"}
          </Button>
        </div>
      </div>

      {/* List keys */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-4">API Keys</h2>
        <table className="w-full text-sm text-slate-300">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Created</th>
              <th className="text-left py-2">Expires</th>
              <th className="text-left py-2">Last Used</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key: any) => (
              <tr key={key.id} className="border-b border-slate-700">
                <td className="py-2">{key.name}</td>
                <td className="py-2">{new Date(key.created_at).toLocaleDateString()}</td>
                <td className="py-2">{new Date(key.expires_at).toLocaleDateString()}</td>
                <td className="py-2">
                  {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
                </td>
                <td className="py-2 flex gap-2">
                  <button
                    onClick={() => handleRotateKey(key.id)}
                    className="text-blue-500 hover:text-blue-400 text-xs"
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => handleRevokeKey(key.id)}
                    className="text-red-500 hover:text-red-400 text-xs"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Priority 4: SSO & Enterprise Auth (Weeks 5–8)

**Effort:** 4 weeks (1.5 BE engineers, 1 FE engineer).

### High-Level Architecture

```
User → Login Page → Detect Org → Redirect to Org SSO Endpoint
                                  ↓
                              OIDC/SAML Provider (Okta, Azure AD, etc.)
                                  ↓
                              Validate ID Token / SAML Response
                                  ↓
                              Lookup/Provision User + Membership
                                  ↓
                              Create Session → Org Dashboard
```

### Database Schema

```sql
ALTER TABLE organizations ADD COLUMN (
    sso_enabled BOOLEAN DEFAULT FALSE,
    sso_provider VARCHAR(50),  -- 'oidc', 'saml2'
    sso_config JSON,  -- { "client_id", "client_secret", "issuer", "metadata_url", etc. }
    sso_auto_provision BOOLEAN DEFAULT FALSE  -- auto-create users from SSO
);

CREATE TABLE sso_domain_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id INT NOT NULL,
    domain VARCHAR(255) NOT NULL,  -- e.g., acme.com
    sso_provider_id INT,  -- link to specific SSO config if multi-tenant
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_domain (domain),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    INDEX idx_org_id (org_id)
);
```

### OIDC Service

```python
# Backend/app/services/sso_service.py

from authlib.integrations.httpx_client import AsyncOAuth2Client
from typing import Dict, Any
import json

class SSOService:
    """Handles OIDC/SAML flow for org-level SSO."""
    
    async def get_authorization_url(self, org_id: int, redirect_uri: str) -> str:
        """Build OIDC authorization URL for org."""
        org = self.db.query(Organization).filter_by(id=org_id).first()
        if not org or not org.sso_enabled:
            raise ValueError("SSO not enabled for this org")
        
        config = json.loads(org.sso_config)
        
        client = AsyncOAuth2Client(
            client_id=config["client_id"],
            client_secret=config["client_secret"],
            redirect_uri=redirect_uri
        )
        
        url, state = client.create_authorization_url(
            f"{config['issuer']}/authorize",
            scope="openid profile email"
        )
        
        # Store state in session for CSRF protection
        return url, state
    
    async def exchange_code_for_token(self, org_id: int, code: str, redirect_uri: str):
        """Exchange authorization code for ID token."""
        org = self.db.query(Organization).filter_by(id=org_id).first()
        config = json.loads(org.sso_config)
        
        client = AsyncOAuth2Client(
            client_id=config["client_id"],
            client_secret=config["client_secret"],
            redirect_uri=redirect_uri
        )
        
        token = await client.fetch_token(
            f"{config['issuer']}/token",
            code=code
        )
        
        # Validate ID token signature
        from authlib.jose import jwt
        claims = jwt.decode(token["id_token"], key=config.get("public_key_url"))
        
        return claims
    
    def provision_user_from_sso(self, org_id: int, claims: Dict[str, Any]):
        """Create/update user based on SSO claims."""
        email = claims.get("email")
        if not email:
            raise ValueError("Email not in SSO claims")
        
        # Lookup or create user
        from app.storage.user_models import User
        user = self.db.query(User).filter_by(email=email).first()
        if not user:
            user = User(
                email=email,
                name=claims.get("name"),
                picture=claims.get("picture")
            )
            self.db.add(user)
            self.db.commit()
        
        # Auto-provision membership if enabled
        org = self.db.query(Organization).filter_by(id=org_id).first()
        if org.sso_auto_provision:
            from app.storage.org_models import OrgMembership
            membership = self.db.query(OrgMembership).filter_by(
                org_id=org_id,
                user_id=user.id
            ).first()
            
            if not membership:
                # Assign default role (e.g., VIEWER)
                default_role = self.db.query(RbacRole).filter_by(
                    name="VIEWER",
                    org_id=org_id
                ).first()
                
                membership = OrgMembership(
                    org_id=org_id,
                    user_id=user.id,
                    role_id=default_role.id if default_role else None,
                    joined_at=datetime.utcnow()
                )
                self.db.add(membership)
                self.db.commit()
        
        return user
```

### API Endpoints

```python
# Backend/app/api/sso_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.services.sso_service import SSOService

router = APIRouter(prefix="/sso")

@router.get("/authorize")
async def sso_authorize(
    org_id: int = Query(...),
    redirect_uri: str = Query(...)
):
    """Initiate OIDC flow."""
    service = SSOService(db)
    url, state = await service.get_authorization_url(org_id, redirect_uri)
    
    # Store state in session/cache for CSRF check
    # response = RedirectResponse(url=url)
    # response.set_cookie("sso_state", state)
    
    return {"authorization_url": url}

@router.get("/callback")
async def sso_callback(
    org_id: int = Query(...),
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """Handle OIDC callback."""
    service = SSOService(db)
    
    # Validate state (CSRF protection)
    # session_state = request.cookies.get("sso_state")
    # if state != session_state:
    #     raise HTTPException(status_code=400, detail="Invalid state")
    
    claims = await service.exchange_code_for_token(
        org_id,
        code,
        redirect_uri="https://app.sentinelai.com/sso/callback"
    )
    
    user = service.provision_user_from_sso(org_id, claims)
    
    # Create session / issue JWT
    token = create_jwt_token(user_id=user.id, org_id=org_id)
    
    return RedirectResponse(
        url=f"/org/{org_id}/dashboard",
        headers={"Set-Cookie": f"auth_token={token}; HttpOnly; Secure"}
    )

@router.put("/orgs/{org_id}/sso-config")
def update_sso_config(
    org_id: int,
    body: dict,  # { "provider": "oidc", "client_id": "...", "client_secret": "..." }
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Admin: configure SSO for org."""
    require_permission(user.id, org_id, "org.sso.manage", db)
    
    org = db.query(Organization).filter_by(id=org_id).first()
    org.sso_enabled = body.get("enabled", True)
    org.sso_provider = body.get("provider")
    org.sso_config = json.dumps(body.get("config"))
    org.sso_auto_provision = body.get("auto_provision", False)
    db.commit()
    
    return {"status": "configured"}
```

---

## Priority 5: Observability, Quotas & Rate-Limiting (Weeks 8–12)

**Effort:** 3–4 weeks (1 BE engineer, 0.5 FE engineer).

### Metrics & Observability

```python
# Backend/app/core/metrics.py

from prometheus_client import Counter, Histogram, Gauge
from functools import wraps

# API request metrics
api_requests = Counter(
    'api_requests_total',
    'Total API requests',
    ['org_id', 'endpoint', 'method', 'status']
)

api_latency = Histogram(
    'api_latency_seconds',
    'API latency',
    ['org_id', 'endpoint'],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0]
)

# Usage metrics
detections_processed = Counter(
    'detections_processed_total',
    'Total detections processed',
    ['org_id']
)

api_calls_per_org = Gauge(
    'api_calls_per_minute',
    'API calls per minute by org',
    ['org_id']
)

def track_api_request(func):
    """Decorator to track API request metrics."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        org_id = kwargs.get('org_id') or (args[0] if args else None)
        start = time.time()
        
        try:
            result = await func(*args, **kwargs)
            status = getattr(result, 'status_code', 200)
        except Exception as e:
            status = 500
            raise
        finally:
            duration = time.time() - start
            api_requests.labels(
                org_id=org_id,
                endpoint=func.__name__,
                method='GET',  # infer from signature
                status=status
            ).inc()
            api_latency.labels(
                org_id=org_id,
                endpoint=func.__name__
            ).observe(duration)
        
        return result
    
    return wrapper
```

### Quotas & Rate-Limiting

```python
# Backend/app/services/quota_service.py

from datetime import datetime, timedelta
from app.storage.usage_models import UsageEvent

class QuotaService:
    """Enforce per-org quotas and rate limits."""
    
    QUOTA_LIMITS = {
        "free": {
            "monthly_detections": 10000,
            "monthly_api_calls": 50000,
            "concurrent_requests": 10,
            "data_retention_days": 30
        },
        "pro": {
            "monthly_detections": 100000,
            "monthly_api_calls": 500000,
            "concurrent_requests": 100,
            "data_retention_days": 90
        },
        "enterprise": {
            "monthly_detections": float('inf'),
            "monthly_api_calls": float('inf'),
            "concurrent_requests": 1000,
            "data_retention_days": 365
        }
    }
    
    def check_quota(self, org_id: int, action: str) -> bool:
        """Check if org has exceeded quota for action."""
        org = self.db.query(Organization).filter_by(id=org_id).first()
        plan = org.billing_plan or "free"
        limit = self.QUOTA_LIMITS[plan].get(f"monthly_{action}s")
        
        if limit == float('inf'):
            return True
        
        # Count usage in current month
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        count = self.db.query(UsageEvent).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.action == action,
            UsageEvent.timestamp >= month_start
        ).count()
        
        return count < limit
    
    def check_rate_limit(self, org_id: int) -> bool:
        """Check if org has exceeded rate limit (requests per minute)."""
        org = self.db.query(Organization).filter_by(id=org_id).first()
        plan = org.billing_plan or "free"
        limit = self.QUOTA_LIMITS[plan].get("concurrent_requests", 10)
        
        # Count active requests in last minute
        minute_ago = datetime.utcnow() - timedelta(minutes=1)
        count = self.db.query(UsageEvent).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.timestamp >= minute_ago
        ).count()
        
        return count < limit
    
    def log_usage(self, org_id: int, action: str, details: dict = None):
        """Log usage event."""
        event = UsageEvent(
            org_id=org_id,
            action=action,
            details=json.dumps(details or {}),
            timestamp=datetime.utcnow()
        )
        self.db.add(event)
        self.db.commit()
```

### Rate-Limit Middleware

```python
# Backend/app/middleware/rate_limit.py

from fastapi import Request, HTTPException
from app.services.quota_service import QuotaService

async def rate_limit_middleware(request: Request, call_next):
    org_id = request.headers.get("X-Org-Id")
    
    if org_id:
        service = QuotaService(db)
        if not service.check_rate_limit(int(org_id)):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    response = await call_next(request)
    return response
```

---

## Implementation Roadmap

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 1–3 | Invite delivery + retries | BE1 | Not Started |
| 1–3 | Invite acceptance UI + E2E tests | FE1 | Not Started |
| 2–3 | Tenancy audit + patch missing checks | BE1 | Not Started |
| 3–4 | Per-org API key CRUD + rotate | BE1 | Not Started |
| 3–4 | API key admin UI | FE1 | Not Started |
| 5–8 | OIDC + SAML integration | BE1, BE2 | Not Started |
| 5–7 | SSO config UI + domain mapping | FE1 | Not Started |
| 8–12 | Observability + metrics export | BE1 | Not Started |
| 8–12 | Quotas + rate-limiting | BE1 | Not Started |

**Total Effort:** ~50–60 engineer-weeks (4–5 FTE over 12 weeks).

---

## Appendix A: Quick Dependency Setup

### Python Packages (Backend)

Add to `requirements.txt`:

```
authlib>=1.2.0          # OAuth2/OIDC
redis>=4.5.0            # Job queue (RQ)
rq>=1.13.0
prometheus-client>=0.16 # Metrics
sqlalchemy-utils>=0.41  # DB utilities
python-multipart>=0.0.5 # Form parsing
```

### Frontend Dependencies

```bash
npm install @clerk/nextjs lucide-react
```

### Infrastructure

- **Redis:** For job queue (RQ) and rate-limiting cache.
- **Prometheus + Grafana:** For metrics visualization (optional but recommended).
- **SMTP/SES:** For email delivery (configure in environment).

---

## Appendix B: Testing Strategy

- **Unit tests:** Services (invite, API key, quota) with mocks.
- **Integration tests:** API endpoints with real DB (test fixtures).
- **E2E tests:** Full flows (invite → accept, create org → invite member → login).
- **Security tests:** Cross-org access checks, permission enforcement, rate limits.

---

## Next Steps

1. **Confirm priorities** with product/security team.
2. **Assign engineers** to tracks (parallel execution recommended).
3. **Setup CI/CD** to auto-test tenancy + RBAC on every PR.
4. **Begin Phase 1:** Invite delivery + tenancy audit (start Week 1).
5. **Report progress** weekly.

---

**Document prepared for implementation guidance. Adjust timelines and effort based on team capacity and product priorities.**
