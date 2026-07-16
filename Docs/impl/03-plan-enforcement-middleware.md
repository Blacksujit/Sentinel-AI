# 03 - Plan Enforcement Middleware

## Objective
Enforce per-org plan limits (monthly API call caps, feature access) with clear HTTP responses and upgrade prompts.

## Architecture

```
Request → Rate Limiter (Redis) → Plan Enforcer (monthly quota) → Handler
```

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `Backend/app/middleware/plan_enforcer.py` | Plan enforcement middleware |

### Modified Files
| File | Change |
|------|--------|
| `Backend/main.py` | Add plan enforcement middleware |
| `Backend/app/services/usage_service.py` | Add quota check method |
| `Backend/app/storage/org_models.py` | Add `feature_flags` JSON column to Organization |

## Implementation

### Plan Enforcer Middleware
- Check `Content-Type` header to skip non-API paths
- Extract org_id from API key or auth token
- Query monthly usage from `usage_events` table
- Compare against plan limits
- If exceeded: return 429 with `{"error": "monthly_limit_exceeded", "upgrade_url": "/billing", "plan": "pro", "usage": {...}}`

### Monthly Usage Tracking
Uses existing `usage_events` table:
```sql
SELECT COUNT(*) FROM usage_events
WHERE org_id = :org_id
AND timestamp >= date_trunc('month', NOW());
```

### Feature Flags per Plan
```json
{
  "custom_detectors": false,
  "webhook_integrations": false,
  "audit_logs": false,
  "sso": false,
  "priority_support": false,
  "sla": false
}
```

### Plan Tier -> Feature Map
| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Basic analysis | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| API Keys | 1 | 5 | 25 | Unlimited |
| Team seats | 1 | 5 | 20 | Unlimited |
| Webhooks | ❌ | ✅ | ✅ | ✅ |
| Audit logs | ❌ | ❌ | ✅ | ✅ |
| Custom detectors | ❌ | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ❌ | ✅ |
| SLA | ❌ | ❌ | ❌ | ✅ |
| Priority support | ❌ | ✅ | ✅ | ✅ |

### Response on Quota Exceeded
```json
{
  "error": "monthly_limit_exceeded",
  "message": "Your plan's monthly API call limit has been reached.",
  "upgrade_url": "/billing",
  "current_plan": "free",
  "suggested_plan": "pro",
  "usage": {
    "used": 1000,
    "limit": 1000,
    "reset_date": "2026-08-01"
  }
}
```
