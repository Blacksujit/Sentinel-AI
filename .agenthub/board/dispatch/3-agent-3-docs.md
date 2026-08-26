# DISPATCH: Agent 3 — Docs Engineer

Session: 20260826-risk-trend
Task: Document the new risk trend endpoint and dashboard chart

## API CONTRACT (build against this)

```
GET /api/orgs/{org_id}/usage/trend?days=30

Response: array of:
{
  "date": "2026-08-01",
  "avg_risk_score": 0.23,
  "event_count": 45,
  "critical_count": 2
}
```

## Your scope

- **Owns:** `docs-site/**`, `Docs/**/*.md`
- **Forbidden:** Backend/app/**, Frontend/app/**, sentinelai-sdk/sentinelai/**
- **Stack:** Markdown, MkDocs/Vitepress
- **Verify before commit:** `cd docs-site && npm run build` (if build fails due to unrelated issues, document what you changed and note the failure)

## What to build

1. Find the API documentation in `Docs/` or `docs-site/` (check ARCHITECTURE.md, API docs, or any existing endpoint reference).
2. Add documentation for the new `GET /api/orgs/{org_id}/usage/trend` endpoint:
   - HTTP method and path
   - Query params (days: default 30, range 1-365)
   - Response shape with a JSON example
   - A short description of what it returns (daily risk trend buckets for the org dashboard)
3. Add a note to the dashboard documentation (if a dashboard-spec or frontend doc exists) describing the new Risk Trend chart and what it shows.
4. Run `cd docs-site && npm run build` to verify docs build.
5. Commit: `git add Docs/ docs-site/ && git commit -m "docs: document GET /api/orgs/{org_id}/usage/trend endpoint and dashboard risk trend chart"`

## Constraints

- Do NOT touch Backend or Frontend source code.
- Every code snippet in docs must match the API contract above exactly.
- If no API endpoint reference doc exists, create one (e.g. `Docs/API_REFERENCE.md`) and document the existing usage endpoints too.
- If `docs-site` build fails for reasons unrelated to your changes (missing deps, etc.), document what you changed and note the build failure in your result summary — don't block on it.
