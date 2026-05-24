# MVP Implementation Roadmap: 2-Week Sprint
**Current State:** <10 users, MVP stage  
**Constraint:** 1 engineer, 2 weeks  
**Goal:** Unblock team collaboration + data safety

---

## 🎯 Reality Check

With 1 engineer and 2 weeks, you **cannot** do comprehensive enterprise features. Instead, focus on:
- **What your users need to function** → Ship it
- **What you need to feel safe** → Ship it  
- **What can wait** → Skip it (for now)

---

## Sprint Allocation (10 Workdays)

| Phase | Days | Outcome |
|-------|------|---------|
| **Phase 1: Team Invites (MVP)** | 4–5 | Users can invite teammates, collaborate without manual onboarding |
| **Phase 2: Tenancy Audit (Critical)** | 3–4 | Verify no cross-org data leaks; add missing checks |
| **Phase 3: Polish + Testing** | 1–2 | Fix bugs, basic E2E tests, deploy |

---

## ✅ Phase 1: Team Invites (Days 1–5)

**Goal:** Enable users to invite teammates without manual admin work.  
**Effort:** 4–5 days for 1 engineer.  
**Tech:** Sync SMTP email (no Redis/job queue yet).

### What to Build

#### 1. Database Schema (No migration needed if already exists)

```sql
-- Check if these columns exist; add if missing
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS (
    recipient_email VARCHAR(255) NOT NULL,
    delivery_status VARCHAR(20) DEFAULT 'sent',  -- sent, failed
    accepted_at TIMESTAMP NULL,
    declined_at TIMESTAMP NULL
);
```

#### 2. Simplified Invite Service (No retries, no async)

```python
# Backend/app/services/invite_service_mvp.py

from datetime import datetime, timedelta
import secrets
from sqlalchemy.orm import Session
from app.storage.invite_models import OrgInvite
from app.storage.org_models import Organization, OrgMembership
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

class InviteServiceMVP:
    """MVP: Simple, sync invite flow (no retries, no job queue)."""
    
    def __init__(self, db: Session):
        self.db = db
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@sentinelai.com")
    
    def create_and_send_invite(
        self,
        org_id: int,
        email: str,
        role_id: int = None
    ) -> dict:
        """Create invite and send email synchronously."""
        org = self.db.query(Organization).filter_by(id=org_id).first()
        if not org:
            raise ValueError(f"Org {org_id} not found")
        
        # Create invite
        invite = OrgInvite(
            org_id=org_id,
            email=email,
            recipient_email=email,
            token=secrets.token_urlsafe(32),
            role_id=role_id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            delivery_status="pending"
        )
        self.db.add(invite)
        self.db.commit()
        
        # Send email (sync, blocking)
        try:
            self._send_email(org.name, email, invite.token)
            invite.delivery_status = "sent"
            self.db.commit()
            success = True
        except Exception as e:
            invite.delivery_status = "failed"
            self.db.commit()
            success = False
            print(f"Email send failed: {e}")
        
        return {
            "invite_id": invite.id,
            "email": email,
            "token": invite.token,
            "success": success,
            "expires_at": invite.expires_at.isoformat()
        }
    
    def accept_invite(self, token: str, user_id: int) -> dict:
        """Accept invite and create membership."""
        invite = self.db.query(OrgInvite).filter_by(token=token).first()
        
        if not invite:
            raise ValueError("Invalid invite token")
        
        if invite.expires_at < datetime.utcnow():
            raise ValueError("Invite expired (was valid for 7 days)")
        
        if invite.accepted_at or invite.declined_at:
            raise ValueError("Invite already processed")
        
        # Create membership
        membership = OrgMembership(
            org_id=invite.org_id,
            user_id=user_id,
            role_id=invite.role_id,
            joined_at=datetime.utcnow()
        )
        self.db.add(membership)
        
        # Mark invite accepted
        invite.accepted_at = datetime.utcnow()
        self.db.commit()
        
        return {
            "org_id": invite.org_id,
            "membership_created": True
        }
    
    def _send_email(self, org_name: str, to_email: str, token: str):
        """Send invite email via SMTP."""
        accept_link = f"https://app.sentinelai.com/org/invite/{token}/accept"
        
        subject = f"You're invited to join {org_name} on SentinelAI"
        body = f"""
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>Join {org_name}</h2>
            <p>You've been invited to collaborate with <strong>{org_name}</strong> on SentinelAI.</p>
            <p>
              <a href="{accept_link}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                Accept Invite
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">
              This invite expires in 7 days. If you're not sure about this, you can ignore this email.
            </p>
          </body>
        </html>
        """
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg.attach(MIMEText(body, "html"))
        
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.sendmail(self.from_email, [to_email], msg.as_string())
```

#### 3. Simple API Endpoints

```python
# Backend/app/api/members_routes_mvp.py (add to existing or new)

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.auth.dependencies import require_authenticated_user, UserInRequest, get_db
from app.services.invite_service_mvp import InviteServiceMVP
from app.rbac.enforce import require_permission
from app.storage.org_models import Organization, OrgMembership

router = APIRouter(prefix="/orgs/{org_id}/members")

class InviteMemberRequest(BaseModel):
    email: EmailStr
    role_id: int = None

@router.post("/invite")
def invite_member(
    org_id: int,
    body: InviteMemberRequest,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Invite member to org. Returns invite status immediately."""
    # Verify org exists and user is member
    org = db.query(Organization).filter_by(id=org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    
    membership = db.query(OrgMembership).filter_by(
        org_id=org_id, user_id=user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
    
    # Check permission (owner/admin only for MVP)
    if membership.role.name not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can invite")
    
    service = InviteServiceMVP(db)
    result = service.create_and_send_invite(
        org_id=org_id,
        email=body.email,
        role_id=body.role_id
    )
    
    status_code = 201 if result["success"] else 202  # 202 = async/retry later
    return result, status_code

@router.post("/invite/{token}/accept")
def accept_invite(
    org_id: int,
    token: str,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Accept invite and join org."""
    service = InviteServiceMVP(db)
    try:
        result = service.accept_invite(token, user.id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
def list_members(
    org_id: int,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """List org members."""
    # Check membership
    membership = db.query(OrgMembership).filter_by(
        org_id=org_id, user_id=user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
    
    members = db.query(OrgMembership).filter_by(org_id=org_id).all()
    
    return {
        "members": [
            {
                "id": m.user.id,
                "name": m.user.name,
                "email": m.user.email,
                "role": m.role.name,
                "joined_at": m.joined_at.isoformat()
            }
            for m in members
        ]
    }
```

#### 4. Minimal Frontend: Accept Invite Page

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
      router.push(`/auth/sign-in?after=invite/${params.token}`);
      return;
    }

    const acceptInvite = async () => {
      try {
        // Call your API endpoint (adjust route)
        const response = await fetch(`/api/invite/${params.token}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.detail || "Failed to accept invite");
          return;
        }

        const data = await response.json();
        setOrgName(data.org_id);

        setTimeout(() => {
          router.push(`/org/${data.org_id}`);
        }, 1500);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    acceptInvite();
  }, [userId, params.token, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <p className="text-white">Accepting invite...</p>
          <div className="mt-4 animate-spin">⏳</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-red-900 text-white p-6 rounded max-w-md">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="bg-green-900 text-white p-6 rounded text-center">
        <p className="text-xl font-semibold">✓ Welcome!</p>
        <p className="mt-2">Redirecting to your org...</p>
      </div>
    </div>
  );
}
```

#### 5. Admin UI: Simple Member Invite Form

```typescript
// Add to existing org settings/members page

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteMemberForm({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleInvite = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/orgs/${orgId}/members/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role_id: null }),
      });

      if (!res.ok) {
        const err = await res.json();
        setStatus("error");
        setMessage(err.detail || "Failed to send invite");
        return;
      }

      const data = await res.json();
      setStatus("success");
      setMessage(`✓ Invite sent to ${email}${!data.success ? " (queued for retry)" : ""}`);
      setEmail("");

      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white">Invite Team Member</h3>
      <div className="flex gap-2">
        <Input
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="flex-1"
        />
        <Button
          onClick={handleInvite}
          disabled={!email || status === "loading"}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {status === "loading" ? "Sending..." : "Send Invite"}
        </Button>
      </div>
      {message && (
        <p className={`text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
```

### Implementation Checklist: Phase 1

- [ ] Add columns to `org_invites` table (if not already there)
- [ ] Create `InviteServiceMVP` class
- [ ] Add 3 API endpoints (invite, accept, list)
- [ ] Create invite accept page (`/org/invite/[token]/accept`)
- [ ] Add invite form to member management UI
- [ ] Test locally: create invite → send email → accept → verify membership
- [ ] Deploy to staging
- [ ] **Total time: 4–5 days**

---

## ✅ Phase 2: Tenancy Audit (Days 6–9)

**Goal:** Verify users cannot see/access other orgs' data.  
**Effort:** 3–4 days (mostly auditing, not coding).  
**Focus:** Quick security scan + minimal fixes.

### What to Check (Spot Check, Not Comprehensive)

```markdown
## Quick Tenancy Audit Checklist

### High-Risk Endpoints (Check First)
- [ ] GET /orgs → Filter to current user's orgs only
- [ ] GET /orgs/{org_id}/members → Check org membership before returning
- [ ] GET /workspaces → Filter by org_id
- [ ] GET /risks → Filter by org_id
- [ ] GET /detections → Filter by org_id (if applicable)
- [ ] DELETE /orgs/{org_id} → Check user is owner

### Pattern to Add Everywhere

Every endpoint MUST have:

1. **Org membership check:**
   ```python
   membership = db.query(OrgMembership).filter_by(
       org_id=org_id, user_id=user.id
   ).first()
   if not membership:
       raise HTTPException(status_code=403, detail="Not a member")
   ```

2. **DB queries filtered by org_id:**
   ```python
   # BAD:
   risks = db.query(Risk).all()  # Returns ALL risks!
   
   # GOOD:
   risks = db.query(Risk).filter_by(org_id=org_id).all()
   ```

3. **Log sensitive mutations:**
   ```python
   audit_log(org_id, event="member.removed", user_id=user.id)
   ```

### Scan Command

```bash
# Find all route handlers
grep -r "def " Backend/app/api/ | grep -v ".pyc"

# Find all queries without .filter_by
grep -r "db.query" Backend/app/api/ | grep -v "filter"
```

### Example Fix

**Before (Vulnerable):**
```python
@router.get("/orgs/{org_id}/members")
def list_members(org_id: int, db: Session = Depends(get_db)):
    members = db.query(OrgMembership).all()  # ❌ Returns ALL members!
    return members
```

**After (Safe):**
```python
@router.get("/orgs/{org_id}/members")
def list_members(
    org_id: int,
    user: UserInRequest = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    # Check user is member of org
    membership = db.query(OrgMembership).filter_by(
        org_id=org_id, user_id=user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
    
    # Return only org members
    members = db.query(OrgMembership).filter_by(org_id=org_id).all()
    return members
```
```

### Testing: Manual Cross-Org Test

```bash
# 1. Create 2 test orgs + users
POST /orgs { "name": "Org A" }  # Get org_id=1
POST /orgs { "name": "Org B" }  # Get org_id=2

# 2. Login as User A (member of Org 1 only)
GET /orgs/1/members  # ✓ Should return members
GET /orgs/2/members  # ✗ Should return 403 (not a member)

GET /orgs/2/risks    # ✗ Should return 403

# 3. Login as User B (member of Org 2 only)
GET /orgs/1/members  # ✗ Should return 403
GET /orgs/1/risks    # ✗ Should return 403
```

### Implementation Checklist: Phase 2

- [ ] List all API endpoints in `Backend/app/api/`
- [ ] For each endpoint: check org_id filtering + membership check
- [ ] Add missing tenancy checks (should be ~5–10 fixes)
- [ ] Add manual cross-org test above
- [ ] Deploy to staging, test with 2 users in different orgs
- [ ] **Total time: 3–4 days**

---

## ✅ Phase 3: Polish + Testing (Days 9–10)

**Goal:** Fix bugs, add minimal tests, deploy.  
**Effort:** 1–2 days.

### What to Do

- [ ] **Test invite flow end-to-end** (create org → invite → accept → verify member)
- [ ] **Test email delivery** (check SMTP works; might fail first time, that's OK)
- [ ] **Test cross-org isolation** (2 users in different orgs can't see each other)
- [ ] **Handle edge cases:**
  - Inviting same email twice (should work, create new invite)
  - Accepting expired invite (should fail with clear message)
  - Accepting invite then member leaves (should be OK)
- [ ] **Deploy to production**

### Quick Test Script

```bash
# Local testing
pytest Backend/tests/test_invite_mvp.py -v
pytest Backend/tests/test_tenancy_mvp.py -v
```

### Minimal Test Cases

```python
# Backend/tests/test_invite_mvp.py

def test_create_and_accept_invite(db, client):
    """E2E: Invite → Accept → Verify member."""
    # 1. User A invites User B
    res = client.post("/orgs/1/members/invite", json={"email": "b@example.com"})
    assert res.status_code == 201
    invite_token = res.json()["token"]
    
    # 2. User B accepts
    res = client.post(f"/orgs/1/members/invite/{invite_token}/accept")
    assert res.status_code == 200
    
    # 3. Verify B is now a member
    res = client.get("/orgs/1/members")
    members = res.json()["members"]
    assert any(m["email"] == "b@example.com" for m in members)

def test_cross_org_isolation(db, client, user_a, user_b):
    """Verify users from Org A cannot see Org B."""
    org_a_token = user_a.token  # member of org 1
    org_b_token = user_b.token  # member of org 2
    
    # User A tries to see Org B
    res = client.get("/orgs/2/members", headers={"auth": org_b_token})
    assert res.status_code == 403
```

---

## 📊 What You'll Ship

| Feature | Status | Value |
|---------|--------|-------|
| **Team invites** | ✅ MVP | Users can now collaborate without manual signup |
| **Tenancy checks** | ✅ MVP | Safe multi-org isolation |
| **Cross-org access** | ✅ Blocked | Data is protected |
| **Email delivery** | ✅ Sync SMTP | Simple, reliable |

---

## 🚀 What You're Skipping (For Later)

| Feature | Why Skip | Can Add Later |
|---------|----------|---------------|
| **Async job queue** | Redis + RQ adds complexity; sync SMTP fine for MVP | Week 4+ if email volume grows |
| **Invite retries** | 1 failure is OK; manual resend later | Week 4+ if needed |
| **SSO/SAML** | Users can sign up manually; not a blocker | Month 2 for enterprise |
| **API key scoping** | Can grant full org access for MVP | Month 2 |
| **Quotas/billing** | Manual limits for now | Month 2 |
| **Advanced audit** | Basic tenancy check enough | Month 3 |
| **Observability** | Logs to stdout fine for <10 users | Month 3 |

---

## 🛠️ Environment Setup (Quick)

### Backend: Add SMTP Config

Add to `.env` or `settings.json`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use Gmail app password, not account password
FROM_EMAIL=noreply@sentinelai.com
```

### Python Dependencies

Add to `requirements.txt`:

```
# If not already there
sqlalchemy>=1.4
pydantic>=1.10
fastapi>=0.95
```

No need for Redis, Celery, or heavy deps yet.

---

## ⏱️ Realistic Timeline

| Milestone | Day | Status |
|-----------|-----|--------|
| Phase 1: Invites (create, send, accept) | 1–5 | Not Started |
| Phase 1: Test locally + fix bugs | 4–5 | Not Started |
| Phase 2: Tenancy audit + spot fixes | 6–8 | Not Started |
| Phase 2: Manual cross-org test | 8–9 | Not Started |
| Phase 3: Polish, deploy to staging | 9 | Not Started |
| Phase 3: Final test + production deploy | 10 | Not Started |

**Buffer:** 0 days (tight schedule, but doable for 1 solid engineer).

---

## 🎯 Success Criteria (Ship It!)

By end of Week 2, users should be able to:

1. ✅ **Create an org** (already works?)
2. ✅ **Invite teammates via email** (NEW)
3. ✅ **Team member accepts invite** (NEW)
4. ✅ **Members see each other in member list** (NEW)
5. ✅ **Each org's data is isolated** (VERIFIED)
6. ✅ **Can't access other org's data** (TESTED)

---

## Next Steps

1. **Day 1 morning:** Audit existing code (do org_invites table + membership checks already exist?)
2. **Day 1 afternoon:** Start Phase 1 (InviteService + endpoints)
3. **Day 5 EOD:** Phase 1 complete, ready to test
4. **Day 6 morning:** Start Phase 2 (tenancy audit)
5. **Day 9 EOD:** Phase 2 complete, staging ready
6. **Day 10:** Deploy to production

---

## Questions Before You Start

1. **Do you already have `org_invites` table + `OrgMembership` model?** → If yes, Phase 1 is even faster (2–3 days)
2. **SMTP credentials ready?** (Gmail, SendGrid, AWS SES) → Set up `.env` now
3. **Can 1 engineer commit full-time for 2 weeks?** → Critical for timeline
4. **Any existing invite/member code I should reuse?** → Share it, might save time

