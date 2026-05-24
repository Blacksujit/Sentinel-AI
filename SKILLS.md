# SentinelAI - Project Skills & Context Documentation

This document captures all conversations, codebase context, and work completed on the SentinelAI project. Use this to maintain context across agentic IDE sessions.

---

## Project Overview

**SentinelAI** is a production-grade AI safety monitoring and risk detection system for LLM applications. It provides real-time prompt anomaly detection, risk scoring, and usage monitoring.

### Tech Stack

**Backend:**
- Python 3.11+
- FastAPI
- SQLAlchemy (PostgreSQL with SQLite fallback)
- Clerk authentication
- Multi-tenant architecture (Organizations, Workspaces)

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Clerk for authentication
- TailwindCSS
- Framer Motion
- shadcn/ui components

---

## Architecture Summary

### Backend Structure

```
Backend/
├── app/
│   ├── api/                 # API routes
│   │   ├── routes.py       # Main analysis routes
│   │   ├── orgs_routes.py  # Organization management
│   │   ├── members_routes.py # Member management
│   │   ├── usage_routes.py  # Usage analytics
│   │   ├── workspace_routes.py # Workspace management
│   │   └── api_keys_routes.py # API key management
│   ├── monitors/            # Detection monitors
│   │   ├── prompt_anomaly.py
│   │   └── jailbreak_rag.py
│   ├── scoring/             # Risk scoring
│   │   ├── output_risk.py
│   │   └── aggregator.py
│   ├── agent/               # Decision reasoning
│   │   └── reasoner.py
│   ├── policy/             # Policy engine
│   │   └── engine.py
│   ├── actions/             # Action execution
│   │   └── executor.py
│   ├── config/             # Configuration
│   │   └── risk_config.py
│   ├── storage/             # Database models
│   │   ├── db.py
│   │   ├── models.py
│   │   ├── user_models.py
│   │   ├── org_models.py
│   │   └── workspace_models.py
│   ├── services/            # Business logic
│   │   ├── user_service.py
│   │   ├── workspace_service.py
│   │   └── usage_service.py
│   ├── middleware/          # Authentication middleware
│   │   └── auth.py
│   ├── auth/               # Authentication dependencies
│   │   ├── dependencies.py
│   │   └── clerk.py
│   ├── tenancy/            # Multi-tenancy
│   │   └── org_context.py
│   ├── rbac/               # Role-based access control
│   │   ├── enforce.py
│   │   └── permissions.py
│   └── knowledge/          # Detection patterns
│       └── jailbreak_patterns.py
└── main.py                 # FastAPI application entry
```

### Frontend Structure

```
Frontend/
├── app/
│   ├── (public)/           # Public routes (no auth)
│   │   ├── page.tsx        # Landing page
│   │   └── start/          # Getting started flow
│   ├── (auth)/             # Authentication routes
│   │   ├── auth/
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   └── org-onboarding/
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── user/
│   │   └── org/[orgId]/
│   ├── (org)/              # Organization-specific routes
│   │   └── org/[orgId]/dashboard/
│   ├── contexts/           # React contexts
│   │   ├── organization-context.tsx
│   │   └── workspace-context.tsx
│   ├── components/         # UI components
│   │   ├── clerk-provider-client.tsx
│   │   └── ui/
│   └── lib/                # Utilities
│       └── api-client.ts
├── middleware.ts           # Next.js middleware (Clerk)
└── layout.tsx              # Root layout
```

---

## Work Completed

### Session 1: System Review & Audit

**Task:** Comprehensive system review and architecture audit

**Completed:**
- Analyzed project structure and architecture
- Reviewed API endpoints and routing
- Examined authentication flow (Clerk integration)
- Assessed database schema and models
- Reviewed risk detection pipeline
- Documented security considerations
- Identified testing limitations (disk space issue)

**Key Findings:**
- Well-structured multi-tenant architecture
- Centralized risk configuration
- Proper separation of concerns
- PostgreSQL with SQLite fallback for development
- Clerk authentication properly integrated
- RBAC system in place

---

### Session 2: Organization Context Error Fix

**Issue:** Users encountering `{"detail":"Organization context required"}` error when calling `/api/orgs/{org_id}/usage`

**Root Cause:**
- Backend's `require_permission` dependency expected either `X-Org-Id` header or `fallback_org_id` parameter
- Frontend API client didn't send `X-Org-Id` header
- Usage route didn't pass `org_id` from URL path as fallback

**Files Modified:**

1. **Backend/app/rbac/enforce.py**
   - Modified `require_permission()` to accept optional `fallback_org_id` parameter
   - Added `require_permission_from_path()` helper that extracts `org_id` from path parameters

2. **Backend/app/api/usage_routes.py**
   - Updated to use `require_permission_from_path("usage.view")`
   - Added import for `require_permission_from_path`

3. **Backend/app/api/orgs_routes.py**
   - Updated to use `require_permission_from_path("org.manage")`
   - Added import for `require_permission_from_path`

4. **Backend/app/api/members_routes.py**
   - Updated to use `require_permission_from_path("member.invite")`
   - Added import for `require_permission_from_path`

**Result:** Organization context error resolved. Backend server running successfully on port 8000.

---

### Session 3: Workspace Creation Issue

**Issue:** Workspaces not being created - logs showing "Workspace Context - Workspaces loaded: []"

**Root Cause:**
- No POST endpoint to create workspaces existed in `workspace_routes.py`
- When organizations were created, no default workspace was automatically created
- Frontend tried to fetch workspaces but found none

**Files Modified:**

1. **Backend/app/api/workspace_routes.py**
   - Added POST endpoint to create workspaces
   - Endpoint creates workspace with default roles
   - Adds creator as workspace member with OWNER role
   - Returns workspace response with member count

2. **Backend/app/api/orgs_routes.py**
   - Added import for `WorkspaceService` (preparation for auto-creation)

**Status:** POST endpoint added. Auto-creation on org creation not yet implemented.

---

### Session 4: Authentication Flow Refactor (In Progress)

**Task:** Refactor authentication flow to support onboarding-first experience

**Current Issues:**
- Clerk authentication triggered immediately on app load
- Users forced to authenticate before exploring
- Incorrect redirect logic (users redirected to landing page after auth)
- No onboarding-first flow exists

**Current Flow (Broken):**
```
Landing Page → Auth Trigger → Dashboard
```

**Expected Flow:**
```
Landing Page → Choose Flow → Onboarding → Auth → Dashboard
```

**Analysis Completed:**
- Reviewed middleware.ts (Clerk middleware protecting all non-public routes)
- Reviewed layout.tsx (ClerkProvider wraps entire app)
- Reviewed (dashboard)/layout.tsx (auth check redirecting to sign-in)
- Reviewed (org)/layout.tsx (client-side, no auth check)
- Reviewed clerk-provider-client.tsx (Clerk configuration)

**Files Identified for Refactor:**
- `Frontend/middleware.ts` - Need to allow onboarding routes without auth
- `Frontend/app/(public)/start/` - Need to implement flow selection
- `Frontend/app/(auth)/org-onboarding/` - Need to implement org onboarding
- `Frontend/app/components/clerk-provider-client.tsx` - May need conditional loading

**Status:** Analysis complete. Implementation not started.

---

## Current State

### Backend
- ✅ Running on http://127.0.0.1:8000
- ✅ Organization context error fixed
- ✅ Workspace creation endpoint added
- ⚠️ Auto workspace creation on org creation not implemented
- ⚠️ PostgreSQL connection failing (using SQLite fallback)
- ⚠️ Missing psycopg module for PostgreSQL

### Frontend
- ✅ Landing page functional
- ✅ Clerk authentication configured
- ⚠️ Authentication triggers too early
- ⚠️ No onboarding-first flow
- ⚠️ Redirect logic incorrect
- ⚠️ Workspaces not loading (backend issue)

---

## Known Issues

1. **Workspace Creation**
   - Frontend shows "Workspaces loaded: []"
   - Need to test if POST endpoint works
   - May need frontend UI to create workspaces

2. **Authentication Flow**
   - Auth triggers immediately on app load
   - No onboarding-first experience
   - Users redirected to landing page after auth

3. **Database**
   - PostgreSQL connection failing (missing psycopg)
   - Using SQLite fallback (not production-ready)

4. **Organization Onboarding**
   - Auto workspace creation not implemented
   - May need to add to org creation flow

---

## Key Configuration

### Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://...
ALLOW_SQLITE_FALLBACK=true
SENTINELAI_API_KEYS=...
ENVIRONMENT=development
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Endpoints

### Public Endpoints
- `GET /` - Landing page
- `GET /docs` - Documentation
- `GET /start` - Getting started

### Authentication
- `GET /auth/sign-in` - Sign in
- `GET /auth/sign-up` - Sign up

### API Routes
- `POST /api/analyze` - Analyze interaction
- `POST /api/analyze/external` - External API analysis
- `GET /api/logs` - Get risk logs
- `GET /api/me` - Get current user
- `POST /api/orgs` - Create organization
- `GET /api/orgs` - List organizations
- `GET /api/orgs/{org_id}` - Get organization
- `GET /api/orgs/{org_id}/usage` - Get org usage (FIXED)
- `GET /api/orgs/{org_id}/members` - List members
- `GET /api/orgs/{org_id}/invites` - List invites
- `POST /api/workspaces` - Create workspace (ADDED)
- `GET /api/workspaces` - List workspaces
- `GET /api/workspaces/{workspace_id}` - Get workspace
- `GET /api/api-keys` - List API keys
- `POST /api/api-keys` - Create API key

---

## Database Schema

### Key Models

**User:**
- id, clerk_user_id, email, name
- onboarding_completed
- created_at, last_login_at

**Organization:**
- id, clerk_org_id, name, slug
- owner_user_id, plan_tier
- company_email
- created_at

**OrgMembership:**
- user_id, org_id, role_id
- joined_at

**Workspace:**
- id, org_id, name, slug
- description, is_default
- created_by_user_id
- created_at, updated_at

**WorkspaceMember:**
- workspace_id, user_id, role_id
- is_active, joined_at

**RiskLog:**
- id, prompt, response
- final_risk_score, decision
- flags, signals
- org_id, workspace_id
- created_at

---

## Risk Detection Pipeline

1. **Signal Detection:**
   - Prompt anomaly detection (heuristic similarity)
   - Jailbreak pattern detection (RAG-based)
   - Output risk scoring (regex patterns)

2. **Risk Aggregation:**
   - Weighted signal combination
   - Severity-aware scoring
   - Confidence calculation

3. **Decision Reasoning:**
   - Risk interpretation
   - Policy evaluation
   - Action recommendation

4. **Action Execution:**
   - Allow/Warn/Block/Escalate
   - Audit logging
   - Notification triggers

### Risk Thresholds
- Allow: ≤0.1
- Warn: ≥0.3
- Block: ≥0.6
- Escalate: ≥0.85

### Signal Weights
- Prompt anomaly: 0.2
- Jailbreak attempt: 0.3
- Unsafe output: 0.5

---

## Next Steps

### High Priority
1. **Complete Authentication Flow Refactor**
   - Implement onboarding-first flow
   - Fix middleware to allow onboarding routes
   - Implement proper redirect logic
   - Test end-to-end user journey

2. **Test Workspace Creation**
   - Verify POST endpoint works
   - Add frontend UI for workspace creation
   - Test workspace loading in context

3. **Implement Auto Workspace Creation**
   - Add default workspace creation on org creation
   - Ensure proper role assignment

### Medium Priority
4. **Fix Database Connection**
   - Install psycopg for PostgreSQL
   - Configure production database

5. **Complete Organization Onboarding**
   - Implement org onboarding flow
   - Add workspace setup steps
   - Add team invitation flow

### Low Priority
6. **Testing**
   - Add unit tests
   - Add integration tests
   - Set up test database

7. **Documentation**
   - API documentation
   - Deployment guide
   - Contributing guidelines

---

## Development Commands

### Backend
```bash
cd Backend
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd Frontend
npm run dev
```

### Database Migrations
```bash
cd Backend
# SQLAlchemy migrations (if using Alembic)
alembic upgrade head
```

---

## Important Notes

### Authentication Flow
- Current: Auth triggers immediately
- Expected: Onboarding first, then auth
- Middleware protects all non-public routes
- ClerkProvider wraps entire app

### Multi-Tenancy
- Organizations are top-level tenants
- Workspaces belong to organizations
- Users can belong to multiple organizations
- RBAC controls access at org and workspace level

### API Client
- Frontend uses custom api-client.ts
- Does not send X-Org-Id header (fixed in backend)
- Uses Bearer token authentication

### State Management
- Organization context in organization-context.tsx
- Workspace context in workspace-context.tsx
- LocalStorage for active workspace ID

---

## Contact & Support

For questions or issues, refer to:
- Backend logs: Console output from uvicorn
- Frontend logs: Browser console
- API documentation: http://localhost:8000/docs
- Clerk dashboard: https://dashboard.clerk.com

---

**Last Updated:** May 20, 2026
**Session Context:** Organization context fix, workspace creation, authentication flow refactor
