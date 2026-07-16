# 01 - Stripe Billing Integration

## Objective
Integrate Stripe subscriptions with SentinelAI's existing `PlanTier` enum (`FREE`, `PRO`, `ENTERPRISE`) to enable paid plans.

## Architecture

```
Frontend (Stripe Checkout) → Backend (create_checkout_session) → Stripe API
Stripe Webhook → Backend (webhook handler) → Update org.plan_tier → DB
```

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `Backend/app/billing/__init__.py` | Package init |
| `Backend/app/billing/stripe_service.py` | Stripe API client: products, prices, checkout, webhooks |
| `Backend/app/api/billing_routes.py` | `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook` |
| `Backend/app/storage/billing_models.py` | `Subscription`, `Invoice` models |
| `Frontend/app/billing/page.tsx` | Billing portal page |
| `Frontend/app/billing/layout.tsx` | Billing layout |

### Modified Files
| File | Change |
|------|--------|
| `Backend/main.py` | Add billing router, Stripe env vars |
| `Backend/.env.example` | Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` |
| `Backend/api/requirements.txt` | Add `stripe>=8.0.0` |

## Implementation Steps

### 1. Billing Models (`Backend/app/storage/billing_models.py`)
- `Subscription` table: `id`, `org_id` (FK), `stripe_subscription_id`, `stripe_customer_id`, `plan_tier`, `status` (active/canceled/past_due), `current_period_start`, `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`
- `Invoice` table: `id`, `org_id` (FK), `stripe_invoice_id`, `amount_due`, `amount_paid`, `status`, `period_start`, `period_end`, `created_at`

### 2. Stripe Service (`Backend/app/billing/stripe_service.py`)
- `create_checkout_session(org_id, price_id, success_url, cancel_url)` → returns Stripe Checkout URL
- `create_portal_session(customer_id, return_url)` → returns Stripe Customer Portal URL
- `handle_webhook_event(payload, sig_header)` → routes to sub-handlers
- `handle_checkout_completed(event)` → creates Subscription record, updates org plan_tier
- `handle_invoice_paid(event)` → creates Invoice record

### 3. Billing Routes (`Backend/app/api/billing_routes.py`)
- `POST /api/billing/create-checkout` - Requires `require_authenticated_user`. Body: `{price_id, org_id}`. Creates Stripe Checkout session, returns URL.
- `POST /api/billing/create-portal` - Requires `require_authenticated_user`. Body: `{org_id}`. Creates Stripe Customer Portal session, returns URL.
- `POST /api/billing/webhook` - Raw body. Verifies Stripe signature. No auth (Stripe signature is auth).

### 4. Frontend Billing Page
- Shows current plan and features per tier
- "Upgrade" button → calls create-checkout → redirects to Stripe
- "Manage billing" button → calls create-portal → redirects to Stripe Customer Portal
- Usage summary showing calls used vs limit

## Plan Tiers & Pricing (env vars)
```env
STRIPE_PRICE_FREE=price_free        # $0
STRIPE_PRICE_PRO_MONTHLY=price_xxx  # $49/month
STRIPE_PRICE_TEAM_MONTHLY=price_yyy # $199/month
STRIPE_PRICE_ENTERPRISE=price_zzz   # Custom
```

## Migration
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    plan_tier VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    org_id INTEGER REFERENCES organizations(id),
    stripe_invoice_id VARCHAR(255) UNIQUE,
    amount_due BIGINT,
    amount_paid BIGINT,
    status VARCHAR(50),
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```
