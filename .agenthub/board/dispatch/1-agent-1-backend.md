# DISPATCH: Agent 1 — Backend Engineer

Session: 20260826-risk-trend
Task: Add risk trend charts to the org dashboard — backend trend endpoint

## API CONTRACT (build against this, not other agents' code)

```
GET /api/orgs/{org_id}/usage/trend?days=30

Response: array of:
{
  "date": "2026-08-01",       // ISO date string, day bucket
  "avg_risk_score": 0.23,    // float 0-1, average final_risk_score that day
  "event_count": 45,         // int, total risk events that day
  "critical_count": 2        // int, events with final_risk_score >= 0.8 that day
}
```

## Your scope

- **Owns:** `Backend/app/api/usage_routes.py`, `Backend/app/services/usage_service.py`, `Backend/tests/`
- **Forbidden:** Frontend/**, sentinelai-sdk/**, docs-site/**
- **Stack:** Python 3.12, FastAPI, SQLAlchemy
- **Verify before commit:** `cd Backend && ruff check app/` and `cd Backend && pytest tests/ -v --tb=short`

## What to build

1. Add a `get_trend(db, org_id, days)` method to `UsageService` in `Backend/app/services/usage_service.py` that queries `RiskLog` (or `UsageEvent` if RiskLog doesn't have org_id) grouped by day, returning the contract shape above. Use `final_risk_score` for avg_risk_score and critical_count (score >= 0.8).
2. Add `GET /api/orgs/{org_id}/usage/trend` route to `Backend/app/api/usage_routes.py` with a `days` query param (default 30, range 1-365). Protect it with `require_permission_from_path("usage.view")` like the existing usage routes.
3. Write a test in `Backend/tests/test_trend.py` that hits the endpoint and verifies the response shape matches the contract.
4. Run `cd Backend && ruff check app/` and `cd Backend && pytest tests/test_trend.py -v --tb=short`. Both must pass.
5. Commit: `git add Backend/app/api/usage_routes.py Backend/app/services/usage_service.py Backend/tests/test_trend.py && git commit -m "feat(backend): add GET /api/orgs/{org_id}/usage/trend endpoint for risk trend charts"`

## Constraints

- Do NOT touch Frontend or SDK files.
- Match the existing code style in usage_routes.py and usage_service.py.
- The endpoint must return an array (not wrapped in an object) to match the contract.
- If RiskLog doesn't have org_id, check UsageEvent or the workspace/org models — the existing usage routes already resolve orgs, follow that pattern.
