# Phase 1: Team Invites - Quick Test Guide

## ✅ What's Been Implemented

### Backend
- ✅ `InviteServiceMVP` class: `Backend/app/services/invite_service_mvp.py`
- ✅ API Endpoints in `Backend/app/api/members_routes.py`:
  - `POST /orgs/{org_id}/members/invite` - Send invite
  - `POST /invites/{token}/accept` - Accept invite
  - `GET /orgs/{org_id}/invites` - List pending invites
  - `DELETE /orgs/{org_id}/invites/{invite_id}` - Revoke invite
  - `GET /orgs/{org_id}/members` - List members
  - `PATCH /orgs/{org_id}/members/{user_id}` - Update member role

### Frontend
- ✅ Invite accept page: `Frontend/app/invite/[token]/page.tsx`
- ✅ Invite form component: `Frontend/app/components/InviteMemberForm.tsx`
- ✅ Updated members page: `Frontend/app/orgs/[orgId]/members/page.tsx`

---

## 🧪 Manual Testing Steps

### Step 1: Start Backend & Frontend

```bash
# Terminal 1: Backend
cd Backend
python main.py
# Should see: "=== Registered Routes ===" with /api/orgs endpoints

# Terminal 2: Frontend
cd Frontend
npm run dev
# Should see: "Ready in Xs"
```

### Step 2: Create Test Organization

1. Go to http://localhost:3000 (or your frontend URL)
2. Sign up with Clerk (or use existing account)
3. Click "Create Organization" and fill in:
   - Name: "Test Team"
   - Slug: "test-team"
4. You should now be an OWNER of the org

### Step 3: Send an Invite

1. Go to `/orgs/{org_id}/members` page
2. Click "Invite Member"
3. Fill in:
   - Email: `teammate@example.com`
   - Role: `DEVELOPER`
4. Click "Send Invite"
5. You should see: `✓ Invite sent to teammate@example.com`

**What happens behind the scenes:**
- Backend creates OrgInvite record
- EmailService sends email (or logs if no SMTP configured)
- Audit log records the action
- Invite token is generated (32 chars)

### Step 4: Accept the Invite

#### Option A: Using Email Link (if SMTP configured)
1. Check email for invite link: `http://localhost:3000/invite/{token}`
2. Click the link
3. Sign in / sign up if needed
4. Should see: "Invite accepted successfully"
5. Redirect to `/orgs/{org_id}` dashboard

#### Option B: Using Direct URL (for testing without SMTP)
1. Find the invite token from backend logs or database
2. Go to: `http://localhost:3000/invite/{token}`
3. Sign in / sign up with email: `teammate@example.com`
4. Click "Send Invite" 
5. Should see: "Invite accepted successfully"
6. Redirect to org page

### Step 5: Verify Membership

1. Go back to `/orgs/{org_id}/members`
2. Refresh page (or wait for auto-reload)
3. Should see both original owner and new member in the list
4. New member should have role: `DEVELOPER`

---

## 🔍 Debugging Checklist

### If invite doesn't send email:
- Check backend logs for: `[InviteService] Email send failed`
- Verify SMTP/Postal environment variables are set:
  ```bash
  echo $SMTP_HOST      # Should not be empty
  echo $SMTP_USER      # Should not be empty
  echo $SMTP_PASSWORD  # Should not be empty
  echo $FROM_EMAIL     # Should not be empty
  ```
- If env vars not set, emails won't send but invite will still be created (status: `pending`)

### If invite accept fails:
- Check if token is correct (should be 32 chars, alphanumeric)
- Check email matches (invite sent to `teammate@example.com`, sign in with same email)
- Check token not expired (invites valid for 7 days)
- Check user not already a member

### If API returns 403 Forbidden:
- Make sure you're an ADMIN or OWNER role
- Check org membership (visit `/orgs/{org_id}/members` first)
- Verify Clerk auth token is being sent

---

## 📊 Database Verification

### Check OrgInvite table:
```bash
# Connect to your database
sqlite3 sentinel_ai.db  # or psql if using PostgreSQL

# List all invites
SELECT id, email, status, expires_at FROM org_invites;

# List pending invites
SELECT id, email, status, token FROM org_invites WHERE status = 'pending';
```

### Check OrgMembership table:
```bash
# Verify new member was added
SELECT user_id, org_id, role_id, joined_at FROM org_memberships WHERE org_id = 1;
```

---

## ✅ Success Criteria

- [ ] Can create invite and receive confirmation
- [ ] Email is sent (or queued if SMTP not configured)
- [ ] Can accept invite with correct email
- [ ] New member appears in members list
- [ ] Audit logs record the actions
- [ ] Tokens expire after 7 days
- [ ] Can't accept expired invites
- [ ] Can't accept with wrong email
- [ ] Can revoke pending invites

---

## 🚀 Next Steps After Testing

1. **Configure Email (if not done):**
   - Set up Postal or SMTP provider
   - Set environment variables in `.env` or deployment config
   - Test actual email delivery

2. **Move to Phase 2: Tenancy Audit**
   - Verify users can't access other orgs' data
   - Add missing org_id filters to queries
   - Test cross-org isolation

3. **Polish UI:**
   - Add invite history/pending list view
   - Add resend invite option
   - Add accept/decline in app notifications

---

## 📝 Environment Variables for Email

Add to `.env` or deployment platform:

```bash
# Email delivery (choose one provider)

# Option 1: SMTP (Gmail, SendGrid, Sendgrid, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@sentinelai.com

# Option 2: Postal (self-hosted email service)
POSTAL_SERVER_URL=https://postal.example.com
POSTAL_API_KEY=your-postal-api-key
POSTAL_SERVER_NAME=sentinelai-server

# Frontend base URL for invite links
FRONTEND_BASE_URL=http://localhost:3000  # or your production URL
```

---

## 🎯 Common Issues

### Issue: "This invitation was sent to a different email address"
- **Cause:** Signing in with different email than invite was sent to
- **Fix:** Sign in with the email the invite was sent to
- **Example:** If invite sent to `alice@company.com`, sign in as `alice@company.com`

### Issue: "Invitation is pending" (but not visible)
- **Cause:** Invitation was sent to `bob@example.com` but you're signed in as `alice@example.com`
- **Fix:** Only the invitee can accept their own invite

### Issue: "You are already a member of this organization"
- **Cause:** User already has membership via different path
- **Fix:** Check members list; if you see yourself, you're already a member

### Issue: Invite token is wrong/doesn't work
- **Cause:** Token was malformed or modified in URL
- **Fix:** Copy exact token from invite email; don't modify it
- **Debug:** Check `org_invites` table for valid tokens: `SELECT token FROM org_invites WHERE status='pending'`

---

Ready to test! 🚀
