# Session: 20260826-tenancy-audit

**Task:** Audit and fix cross-org data leak risks — ensure every org-scoped
endpoint enforces org membership before returning org data.

**Status:** staged (ready to dispatch when terminal is available)
**Base branch:** main
**Template:** bug-fixer (multi-surface: backend + test-writer)

## Why this session

Phase 2 of `Docs/MVP_IMPLEMENTATION_PRIORITIES.md` is "Tenancy Audit —
verify no cross-org data leaks." This is the critical safety gap.

## The gap (found during investigation)

Every org-scoped endpoint MUST call `require_org_membership()` before
returning org data. Investigation found three route files that resolve
the org but do NOT verify the caller is a member of that org:

### Confirmed gaps

1. **`Backend/app/api/usage_routes.py`** — all 3 endpoints
   (`/orgs/{org_id}/usage`, `/usage/stats`, `/usage/trend`) use
   `require_permission_from_path("usage.view")`. That helper DOES call
   `require_org_membership` internally (via `require_permission`), so the
   membership check runs. BUT the helper returns
   `Depends(dependency)` while the routes declare it as a default-arg
   `_ = require_permission_from_path(...)` — the dependency is never
   invoked as a FastAPI dependency, so the check may be skipped.
   **→ Needs verification + a regression test.**

2. **`Backend/app/api/billing_routes.py`** — `/create-checkout` and
   `/create-portal` resolve the org via `_resolve_org(req.org_id, db)`
   and call `Depends(require_authenticated_user)`, but never call
   `require_org_membership`. An authenticated user from Org A can create
   a checkout session / billing portal for Org B by passing Org B's id.
   **→ Real cross-org leak. Needs fix + test.**

3. **`Backend/app/api/api_keys_routes.py`** — legacy admin routes gated by
   `require_admin` (a shared admin token). The `org_slug` is taken from a
   query param and resolved by slug with no membership check. If the
   admin token is shared/leaked, any admin can list/revoke any org's
   API keys. Lower risk (admin-gated) but inconsistent with the tenancy
   model.
   **→ Document as accepted risk or add org-scope to admin token.**

### Confirmed SAFE (for reference)

- `members_routes.py` — calls `require_org_membership` ✓
- `org_api_keys_routes.py` — calls `require_org_membership` ✓
- `orgs_routes.py` — calls `require_org_membership` ✓
- `redteam_routes.py` — calls `require_org_membership` ✓
- `workspace_routes.py` — calls `_require_workspace_member` ✓
- `workspace_intel_routes.py` — calls `require_workspace_member_from_path` ✓

## Dispatch plan (3 agents)

### Agent 1 — backend-engineer (bug-fixer)
- **Surface:** `Backend/app/api/`
- **Strategy:** top-down — trace each route to confirm whether the
  membership check actually executes at request time.
- **Fix targets:**
  1. `usage_routes.py` — confirm whether `require_permission_from_path`
     runs as a real dependency; if not, wire it as `Depends(...)`.
  2. `billing_routes.py` — add `require_org_membership(db, user.id, org.id)`
     to `/create-checkout` and `/create-portal`.
- **Verify:** `cd Backend && ruff check app/ && pytest tests/ -v --tb=short`

### Agent 2 — backend-engineer (test-writer)
- **Surface:** `Backend/tests/`
- **Strategy:** integration tests that prove cross-org isolation.
- **Write:**
  - `tests/test_tenancy_isolation.py` — user in Org A requests Org B's
    usage/stats/trend → expect 403.
  - `tests/test_tenancy_isolation.py` — user in Org A creates checkout for
    Org B → expect 403.
  - Positive control: user in Org A requests Org A data → 200.
- **Verify:** `cd Backend && pytest tests/test_tenancy_isolation.py -v`

### Agent 3 — docs-engineer (refactorer)
- **Surface:** `Docs/`
- **Strategy:** document the tenancy model so future routes don't repeat
  the gap.
- **Write/update:**
  - `Docs/TENANCY_MODEL.md` — the rule: every org-scoped endpoint MUST
    call `require_org_membership` or `require_permission_from_path`
    (correctly wired as `Depends`). List the audit results table.
- **Verify:** content matches the code (audit table must reflect reality).

## Acceptance criteria

1. An authenticated user from Org A gets 403 for every Org B data endpoint.
2. New test file `tests/test_tenancy_isolation.py` passes and would fail
   before the fix.
3. `ruff check app/` is clean.
4. `Docs/TENANCY_MODEL.md` exists and its audit table matches the code.
5. No existing test regresses.

## How to launch (when terminal is back)

```bash
HUB=.opencode/skills/agenthub/scripts
python $HUB/hub_init.py \
  --task "Fix cross-org data leak risks in usage and billing routes; add tenancy isolation tests; document tenancy model" \
  --agents 3 \
  --base-branch main
```

Then dispatch the three agents per the plan above, using the bug-fixer /
test-writer / refactorer templates from
`.agenthub/templates/dispatch-prompts.md`.
