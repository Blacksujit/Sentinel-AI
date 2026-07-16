# 06 - Frontend Billing Portal & Usage Dashboard

## Objective
Build the billing management UI and usage analytics dashboard for end users.

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `Frontend/app/billing/page.tsx` | Billing & usage page |
| `Frontend/app/billing/layout.tsx` | Billing layout |
| `Frontend/components/billing/PlanCard.tsx` | Plan tier display card |
| `Frontend/components/billing/UsageChart.tsx` | Usage visualization |
| `Frontend/components/billing/InvoiceList.tsx` | Invoice history list |
| `Frontend/components/billing/PlanFeatureTable.tsx` | Feature comparison |

### Modified Files
| File | Change |
|------|--------|
| `Frontend/app/(public)/page.tsx` | Link to billing from dashboard |
| `Frontend/components/navigation.tsx` | Add billing link |

## Implementation

### Billing Page Layout
```
┌─────────────────────────────────────┐
│ Current Plan: Pro                    │
│ Usage: 12,450 / 50,000 API calls    │
│ [██████████░░░░░░░░░░░] 24.9%       │
│ Reset: Aug 1, 2026                   │
│                                      │
│ [Upgrade] [Manage Billing → Stripe]  │
├─────────────────────────────────────┤
│ Plan Comparison Table                │
│ ┌────────┬──────┬─────┬──────────┐  │
│ │ Free   │ Pro  │Team │Enterprise│  │
│ │ $0     │$49/m │$199/m│ Custom   │  │
│ │ 1K/mo │50K/mo│500K  │Unlimited │  │
│ └────────┴──────┴─────┴──────────┘  │
├─────────────────────────────────────┤
│ Invoice History                      │
│ - Jul 1, 2026 - $49.00 ✓ Paid       │
│ - Jun 1, 2026 - $49.00 ✓ Paid       │
└─────────────────────────────────────┘
```

### API Integration
- `POST /api/billing/create-checkout` → Redirect to Stripe Checkout
- `POST /api/billing/create-portal` → Redirect to Stripe Customer Portal
- `GET /api/orgs/{org_id}/usage/stats` → Usage data for charts
- `GET /api/orgs/{org_id}/subscription` → Current plan details
- `GET /api/orgs/{org_id}/invoices` → Invoice history
