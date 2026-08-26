# SentinelAI Tenancy Model

**Last audited:** 2026-08-26
**Scope:** All org-scoped API endpoints under `Backend/app/api/`

## The Rule

Every org-scoped endpoint MUST verify that the caller is a member of the
target organization before returning org data or creating org-scoped
artifacts.

There are two acceptable enforcement patterns:

### Pattern 1 — Explicit membership check (recommended)

```python
@router.get("/orgs/{org_id}/something")
async def get_something(
    org_id: str,
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    org = resolve_org(db, org_id)
    require_org_membership(db, user_id=user.id, org_id=org.id)
    # ... return org data
```

`Depends(require_authenticated_user)` sets `request.state.clerk_user_id`
and returns the authenticated `User`. The explicit `require_org_membership`
call then verifies the user belongs to the org.

### Pattern 2 — Permission-from-path (usage routes)

```python
@router.get("/orgs/{org_id}/usage")
async def get_usage(
    org_id: str,
    _: None = require_permission_from_path("usage.view"),
    db: Session = Depends(get_db),
):
    org = resolve_org(db, org_id)
    return UsageService.aggregate_for_org(db, org.id)
```

`require_permission_from_path` returns `Depends(...)`, which FastAPI
executes as a dependency. It internally calls `require_permission`,
which resolves the org, checks `request.state.clerk_user_id`, calls
`require_org_membership`, and verifies the user has the named permission.

**⚠️ Important:** `require_permission_from_path` relies on
`request.state.clerk_user_id` being set. This is set by
`require_authenticated_user`. Routes that use
`require_permission_from_path` without also using
`Depends(require_authenticated_user)` depend on another dependency or
middleware in the same request having set `clerk_user_id` first. If no
dependency sets it, the route returns 401.

## Audit Results (2026-08-26)

| Route file | Endpoint(s) | Enforcement | Status |
|------------|-------------|-------------|--------|
| `members_routes.py` | invite, list, remove | `require_org_membership` | ✅ Safe |
| `org_api_keys_routes.py` | create, list, revoke, rotate | `require_org_membership` | ✅ Safe |
| `orgs_routes.py` | get, settings, audit-logs, baselines | `require_org_membership` | ✅ Safe |
| `redteam_routes.py` | run, results, list | `require_org_membership` | ✅ Safe |
| `workspace_routes.py` | create, list, members | `_require_workspace_member` | ✅ Safe |
| `workspace_intel_routes.py` | intel endpoints | `require_workspace_member_from_path` | ✅ Safe |
| `usage_routes.py` | usage, stats, trend | `require_permission_from_path` → `require_org_membership` | ✅ Safe |
| `billing_routes.py` | create-checkout, create-portal | **Was: none** → **Now: `require_org_membership`** | ✅ Fixed |
| `api_keys_routes.py` | list, create, revoke (legacy) | `require_admin` (shared admin token) | ⚠️ Accepted risk |

## Fixed in this session

### `billing_routes.py` — cross-org checkout/portal leak

**Before:** `/create-checkout` and `/create-portal` resolved the org from
the caller-supplied `org_id` in the request body and called
`Depends(require_authenticated_user)` but never verified the user was a
member of that org. An authenticated user from Org A could create a Stripe
checkout session or billing portal session for Org B.

**After:** Both endpoints now call
`require_org_membership(db, user_id=user.id, org_id=org.id)` immediately
after resolving the org. Non-members get 403.

**Regression test:** `Backend/tests/test_tenancy_isolation.py`
— `TestBillingTenancy` proves Org A users get 403 on Org B billing
endpoints, and positive controls confirm Org A users pass for Org A.

## Accepted risks

### `api_keys_routes.py` — legacy admin routes

These routes are gated by `require_admin`, which checks a shared
`SENTINELAI_ADMIN_TOKEN` environment variable. The `org_slug` query
parameter is resolved by slug with no per-user membership check. If the
admin token is shared or leaked, any admin can list/revoke any org's API
keys.

**Mitigation:** Keep the admin token secret and rotated. Consider
deprecating these routes in favor of `org_api_keys_routes.py`, which
enforces per-org membership + RBAC.

## How to add a new org-scoped route

1. Add `Depends(require_authenticated_user)` to get the authenticated user.
2. Resolve the org with `resolve_org(db, org_id)` or
   `resolve_org_from_request(request, db)`.
3. Call `require_org_membership(db, user_id=user.id, org_id=org.id)`.
4. If the route needs a specific permission, also call
   `require_permission_from_path("permission.key")` or check
   `user_permissions_for_org`.
5. Add a test to `tests/test_tenancy_isolation.py` proving cross-org
   access returns 403.
