# Production Deployment Audit & Fixes — 2026-08-26

## Root Cause

The app works locally but fails on production (Vercel + Render) due to 5
distinct issues. All verified against the actual codebase.

---

## Issue 1: NEXT_PUBLIC_API_URL missing in production (CRITICAL)

**File:** `Frontend/app/lib/backend-url.ts`, `Frontend/lib/backend-url.ts`,
`Frontend/next.config.js`

**Problem:** `backendApiUrl()` falls back to `http://localhost:8000` when
`NEXT_PUBLIC_API_URL` is unset. Locally that works (the backend runs on
localhost). In production on Vercel, `localhost:8000` is the serverless
function container — NOT the Render backend. Every API call returns 500
or hangs.

`next.config.js` also hardcoded `NEXT_PUBLIC_API_URL:
process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'` in the `env`
block, masking the missing var.

**Fix:**
- `backend-url.ts` (both copies): throw a clear error in production when
  the env var is missing, instead of silently using localhost. Dev
  fallback preserved.
- `next.config.js`: removed the localhost fallback from the `env` block.
  Removed conflicting `rewrites()` that bypassed the route handlers.

---

## Issue 2: next.config.js rewrites conflict with route handlers

**File:** `Frontend/next.config.js`

**Problem:** The rewrites proxied `/api/*` directly to the backend,
bypassing the 27 server-side route handlers in `app/api/`. The route
handlers forward auth headers; the rewrites don't. On Vercel, route
handlers take precedence, so the rewrites were dead weight — but they
masked the real proxy problem during local dev and caused confusion.

**Fix:** Removed the `rewrites()` block. Added a comment explaining that
API proxying is handled by route handlers with auth forwarding.

---

## Issue 3: Client-side fetch calls missing auth tokens (CRITICAL)

**Files:** 5 frontend pages/components

**Problem:** Several client-side `fetch("/api/...")` calls passed no
`Authorization` header. The proxy route handlers forward whatever they
receive. The backend's `require_authenticated_user` dependency requires a
Clerk JWT. Result: 401 on every protected endpoint in production.

**Pages fixed:**
1. `app/(dashboard)/user/logs/page.tsx` — added `useAuth` + `getToken()`,
   pass `Authorization: Bearer ${token}` on the logs fetch.
2. `app/(dashboard)/user/review-queue/page.tsx` — added auth to both the
   GET (load queue) and POST (submit review) fetches.
3. `app/api-keys/page.tsx` — added auth to load, create, and revoke.
4. `app/logs/LogsPageClientModern.tsx` — added auth to the retry fetch.
5. `app/logs/LogsPageClient.tsx` — added auth to the retry fetch (legacy).

**Already had auth (verified, no change needed):**
- `app/(dashboard)/user/playground/page.tsx` ✓
- `app/contexts/organization-context.tsx` ✓
- `app/contexts/workspace-context.tsx` ✓
- `app/settings/SettingsPageContent.tsx` ✓
- `app/(auth)/org-onboarding/page.tsx` ✓
- `app/components/InviteMemberForm.tsx` ✓
- `app/hooks/useRiskLogs.ts` → `app/services/logs.ts` ✓

---

## Issue 4: Missing /api/waitlist route (404)

**Files:** `Frontend/app/api/waitlist/route.ts` (new)

**Problem:** `WaitlistForm.tsx` calls `fetch('/api/waitlist')` but no
route handler or backend endpoint existed. Returns 404 on production.

**Fix:** Created a lightweight route handler that validates the email,
deduplicates, and stores to a JSON file (best-effort on Vercel's read-only
filesystem). Documented that it should be replaced with a DB table or
external form provider for production use.

---

## Issue 5: Backend CORS hardcoded + missing X-Org-Id header

**File:** `Backend/main.py`

**Problem:** CORS origins were hardcoded to specific URLs. If the
production Vercel URL changed, CORS would break silently. The `X-Org-Id`
header (used by `InviteMemberForm.tsx` and org-scoped routes) was not in
the allowed headers list.

**Fix:** Made CORS origins env-driven via `CORS_ALLOW_ORIGINS` env var
(comma-separated), with the existing list as fallback. Added `X-Org-Id`
to allowed headers.

---

## Issue 6: Render config incomplete

**File:** `Backend/.render.yaml`

**Problem:** Only `ENVIRONMENT` was set. `DATABASE_URL`,
`CLERK_JWT_PUBLIC_KEY`, `CORS_ALLOW_ORIGINS`, Stripe, and SMTP were not
listed. Without `CLERK_JWT_PUBLIC_KEY` in production, every authenticated
request fails with 500 ("JWT verification key not configured"). Without
`DATABASE_URL`, the app silently falls back to SQLite (data loss on
redeploy).

**Fix:** Added all required env vars to `.render.yaml`, including a
PostgreSQL database resource. Marked secrets as `sync: false` (set
manually in Render dashboard). Set `ALLOW_SQLITE_FALLBACK=false` to fail
loud instead of silently losing data.

---

## Environment Variables Required on Render

| Variable | Purpose | Required |
|----------|---------|----------|
| `ENVIRONMENT` | production | yes |
| `DATABASE_URL` | PostgreSQL connection | yes |
| `CLERK_JWT_PUBLIC_KEY` | JWT verification (PEM) | yes |
| `CORS_ALLOW_ORIGINS` | Frontend Vercel URL | yes |
| `ALLOW_SQLITE_FALLBACK` | Set to `false` | yes |
| `STRIPE_SECRET_KEY` | Billing | if billing enabled |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | if billing enabled |
| `STRIPE_PRICE_PRO` | Pro plan price ID | if billing enabled |
| `STRIPE_PRICE_TEAM` | Team plan price ID | if billing enabled |
| `STRIPE_PRICE_ENTERPRISE` | Enterprise price ID | if billing enabled |
| `SMTP_HOST` | Email sending | if invites enabled |
| `SMTP_PORT` | Email port | if invites enabled |
| `SMTP_USER` | Email auth | if invites enabled |
| `SMTP_PASSWORD` | Email auth | if invites enabled |
| `FROM_EMAIL` | Sender address | if invites enabled |

## Environment Variables Required on Vercel

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Render backend origin (no /api) | CRITICAL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | yes |
| `CLERK_SECRET_KEY` | Clerk backend key | yes |

---

## Verification

Terminal was unavailable this session (safety reviewer down). To verify
after deploying:

```bash
# Frontend type check
cd Frontend && npm run type-check

# Frontend build
cd Frontend && npm run build

# Backend lint
cd Backend && ruff check app/

# Backend tests
cd Backend && pytest tests/ -v --tb=short

# Manual: hit /api/health on the Render URL
curl https://your-backend.onrender.com/api/health

# Manual: check CORS
curl -I -X OPTIONS -H "Origin: https://sentinel-ai-hazel.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://your-backend.onrender.com/api/logs
```
