'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  CreditCard,
  Check,
  X as XIcon,
  Zap,
  Building2,
  FileText,
  ExternalLink,
  Loader2,
  ArrowUpCircle,
  Wallet,
  Coins,
  Plus,
  History,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui'
import { apiGet, apiPost } from '@/lib/api-client'
import { getStripe } from '@/lib/stripe'
import { useAuth } from '@clerk/nextjs'

interface BillingConfig {
  stripe_publishable_key: string
  prices: {
    pro: string
    team: string
    enterprise: string
  }
}

interface SubscriptionData {
  plan_tier: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
}

interface InvoiceData {
  id: number
  amount_due: number
  amount_paid: number
  currency: string
  status: string
  period_start: string | null
  period_end: string | null
  paid_at: string | null
  invoice_url: string | null
  created_at: string | null
}

interface UsageData {
  used: number
  limit: number
  plan: string
  remaining: number
}

interface WalletData {
  balance_credits: number
  total_purchased: number
  total_consumed: number
}

interface CreditPack {
  id: string
  credits: number
  amount_cents: number
  label: string
}

interface TokenUsageItem {
  id: number
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_credits: number
  source: string
  created_at: string
}

const CREDIT_PACKS = [
  { id: 'credits_1000', credits: 1000, amount_cents: 1000, label: '1,000 Credits' },
  { id: 'credits_5000', credits: 5000, amount_cents: 5000, label: '5,000 Credits' },
  { id: 'credits_10000', credits: 10000, amount_cents: 10000, label: '10,000 Credits' },
  { id: 'credits_25000', credits: 25000, amount_cents: 25000, label: '25,000 Credits' },
]

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    calls: '1,000',
    rate: '10 req/min',
    features: [
      { label: 'Basic analysis', included: true },
      { label: 'Dashboard', included: true },
      { label: 'API Keys', included: true, value: '1' },
      { label: 'Team seats', included: true, value: '1' },
      { label: 'Webhooks', included: false },
      { label: 'Audit logs', included: false },
      { label: 'Custom detectors', included: false },
      { label: 'SSO', included: false },
    ],
    cta: 'Current Plan',
    ctaVariant: 'outline' as const,
    highlighted: false,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/mo',
    calls: '50,000',
    rate: '60 req/min',
    features: [
      { label: 'Basic analysis', included: true },
      { label: 'Dashboard', included: true },
      { label: 'API Keys', included: true, value: '5' },
      { label: 'Team seats', included: true, value: '5' },
      { label: 'Webhooks', included: true },
      { label: 'Audit logs', included: false },
      { label: 'Custom detectors', included: false },
      { label: 'SSO', included: false },
    ],
    cta: 'Upgrade',
    ctaVariant: 'default' as const,
    highlighted: true,
  },
  {
    tier: 'team',
    name: 'Team',
    price: '$199',
    period: '/mo',
    calls: '500,000',
    rate: '300 req/min',
    features: [
      { label: 'Basic analysis', included: true },
      { label: 'Dashboard', included: true },
      { label: 'API Keys', included: true, value: '25' },
      { label: 'Team seats', included: true, value: '20' },
      { label: 'Webhooks', included: true },
      { label: 'Audit logs', included: true },
      { label: 'Custom detectors', included: true },
      { label: 'SSO', included: false },
    ],
    cta: 'Upgrade',
    ctaVariant: 'default' as const,
    highlighted: false,
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    calls: 'Unlimited',
    rate: '1,000 req/min',
    features: [
      { label: 'Basic analysis', included: true },
      { label: 'Dashboard', included: true },
      { label: 'API Keys', included: true, value: 'Unlimited' },
      { label: 'Team seats', included: true, value: 'Unlimited' },
      { label: 'Webhooks', included: true },
      { label: 'Audit logs', included: true },
      { label: 'Custom detectors', included: true },
      { label: 'SSO', included: true },
    ],
    cta: 'Contact Sales',
    ctaVariant: 'outline' as const,
    highlighted: false,
  },
]

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function BillingPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const orgId = params?.orgId as string

  const [config, setConfig] = useState<BillingConfig | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [tokenUsage, setTokenUsage] = useState<TokenUsageItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!orgId) return
    try {
      const token = await getToken()
      const [cfg, sub, inv, usg, wlt, tok] = await Promise.all([
        apiGet<BillingConfig>('/api/billing/config', token),
        apiGet<SubscriptionData>(`/api/billing/subscription?org_id=${orgId}`, token),
        apiGet<InvoiceData[]>(`/api/billing/invoices?org_id=${orgId}&limit=12`, token),
        apiGet<UsageData>(`/api/billing/usage?org_id=${orgId}`, token),
        apiGet<WalletData>(`/api/billing/wallet?org_id=${orgId}`, token),
        apiGet<TokenUsageItem[]>(`/api/billing/token-usage?org_id=${orgId}&limit=10`, token),
      ])
      setConfig(cfg)
      setSubscription(sub)
      setInvoices(inv)
      setUsage(usg)
      setWallet(wlt)
      setTokenUsage(tok)
    } catch (error) {
      console.error('Failed to load billing data:', error)
      toast.error('Failed to load billing data')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, getToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCheckout = async (priceId: string, planTier: string) => {
    setActionLoading(planTier)
    try {
      const token = await getToken()
      const res = await apiPost<{ url?: string; error?: string }>(
        '/api/billing/create-checkout',
        { org_id: parseInt(orgId), price_id: priceId },
        token,
      )
      if (res.url) {
        window.location.href = res.url
      } else {
        toast.error(res.error || 'Failed to create checkout session')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start upgrade')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePortal = async () => {
    setActionLoading('portal')
    try {
      const token = await getToken()
      const res = await apiPost<{ url?: string; error?: string }>(
        '/api/billing/create-portal',
        { org_id: parseInt(orgId) },
        token,
      )
      if (res.url) {
        window.location.href = res.url
      } else {
        toast.error(res.error || 'Failed to open billing portal')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to open billing portal')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBuyCredits = async (credits: number, amountCents: number) => {
    setActionLoading(`credits_${credits}`)
    try {
      const token = await getToken()
      const res = await apiPost<{ clientSecret?: string; error?: string }>(
        '/api/billing/create-topup-intent',
        { org_id: parseInt(orgId), credits, amount_cents: amountCents },
        token,
      )
      if (res.clientSecret && config?.stripe_publishable_key) {
        const stripe = await getStripe(config.stripe_publishable_key)
        if (!stripe) { toast.error('Stripe failed to load'); return }
        const { error } = await stripe.confirmCardPayment(res.clientSecret)
        if (error) {
          toast.error(error.message || 'Payment failed')
        } else {
          toast.success(`${credits.toLocaleString()} credits added!`)
          loadData()
        }
      } else {
        toast.error(res.error || 'Failed to create payment')
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment failed')
    } finally {
      setActionLoading(null)
    }
  }

  const usagePercent = usage ? Math.round((usage.used / usage.limit) * 100) : 0
  const currentPlan = subscription?.plan_tier || 'free'
  const isOnPaidPlan = currentPlan !== 'free' && subscription?.status === 'active'

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and usage</p>
      </motion.div>

      {/* Current Plan + Usage */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Plan card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Current Plan</CardTitle>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <Badge variant={isOnPaidPlan ? 'success' : 'secondary'}>
                  {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ) : (
              <>
                {/* Usage bar */}
                {usage && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        API Calls this period
                      </span>
                      <span className="font-medium tabular-nums">
                        {usage.used.toLocaleString()} / {usage.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2.5 bg-[color:var(--paper-sunken)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          usagePercent >= 90
                            ? 'bg-[color:var(--red)]'
                            : usagePercent >= 70
                              ? 'bg-[color:var(--amber)]'
                              : 'bg-[color:var(--green)]'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{usagePercent}% used</span>
                      <span>{usage.remaining.toLocaleString()} remaining</span>
                    </div>
                  </div>
                )}

                {/* Subscription info */}
                <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-medium capitalize">{subscription?.status || 'No subscription'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rate limit</span>
                    <p className="font-medium">
                      {PLANS.find((p) => p.tier === currentPlan)?.rate || '10 req/min'}
                    </p>
                  </div>
                  {subscription?.current_period_end && (
                    <div>
                      <span className="text-muted-foreground">Period end</span>
                      <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
                    </div>
                  )}
                  {subscription?.cancel_at_period_end && (
                    <div>
                      <span className="text-muted-foreground">Cancellation</span>
                      <p className="font-medium text-[color:var(--red)]">Cancels at period end</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {isOnPaidPlan ? (
                    <Button
                      variant="outline"
                      onClick={handlePortal}
                      disabled={actionLoading === 'portal'}
                    >
                      {actionLoading === 'portal' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Manage Billing
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={() => {
                        if (config?.prices.pro) handleCheckout(config.prices.pro, 'pro')
                        else toast.error('Pro plan not configured yet')
                      }}
                      disabled={actionLoading === 'pro'}
                    >
                      {actionLoading === 'pro' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Upgrade to Pro
                    </Button>
                  )}
                  {!isLoading && !isOnPaidPlan && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (config?.prices.team) handleCheckout(config.prices.team, 'team')
                        else toast.error('Team plan not configured yet')
                      }}
                      disabled={actionLoading === 'team'}
                    >
                      {actionLoading === 'team' && <Loader2 className="h-4 w-4 animate-spin" />}
                      Upgrade to Team
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Wallet Balance card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Credits Wallet</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : wallet ? (
              <>
                <div className="text-center py-2">
                  <div className="text-3xl font-bold tabular-nums text-primary">
                    {wallet.balance_credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Available Credits</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[color:var(--paper-sunken)] rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold tabular-nums text-[color:var(--green)]">
                      {wallet.total_purchased.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Purchased</div>
                  </div>
                  <div className="bg-[color:var(--paper-sunken)] rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold tabular-nums text-[color:var(--amber)]">
                      {wallet.total_consumed.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Consumed</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Wallet not available
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Buy Credits */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-primary" />
              <CardTitle>Buy Credits</CardTitle>
            </div>
            <CardDescription>Purchase credit packs to continue using AI-powered analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CREDIT_PACKS.map((pack) => {
                const loading = actionLoading === pack.id
                return (
                  <Card key={pack.id} variant="default" className="flex flex-col">
                    <CardHeader className="text-center pb-3">
                      <div className="text-2xl font-bold">{pack.credits.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">credits</div>
                    </CardHeader>
                    <CardContent className="text-center pt-0 flex-1 flex flex-col">
                      <div className="text-lg font-semibold mb-3">
                        ${(pack.amount_cents / 100).toFixed(0)}
                      </div>
                      <div className="mt-auto">
                        <Button
                          variant="default"
                          className="w-full"
                          onClick={() => handleBuyCredits(pack.credits, pack.amount_cents)}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Buy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Token Usage History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>Token Usage History</CardTitle>
            </div>
            <CardDescription>AI analysis credit consumption per request</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : tokenUsage.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No token usage yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-[color:var(--border-color)]">
                      <th className="pb-2 font-medium">Model</th>
                      <th className="pb-2 font-medium text-right">Input</th>
                      <th className="pb-2 font-medium text-right">Output</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                      <th className="pb-2 font-medium text-right">Cost</th>
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenUsage.map((item) => (
                      <tr key={item.id} className="border-b border-[color:var(--border-color)]/50">
                        <td className="py-2.5 pr-4">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {item.model}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{item.input_tokens.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">{item.output_tokens.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-medium">{item.total_tokens.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-[color:var(--amber)]">{item.cost_credits}</td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground capitalize">{item.source}</td>
                        <td className="py-2.5 pl-2 text-right text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Plan Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              <CardTitle>Compare Plans</CardTitle>
            </div>
            <CardDescription>Choose the plan that fits your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = plan.tier === currentPlan
                const isEnterprise = plan.tier === 'enterprise'
                const priceId = config?.prices[plan.tier as keyof typeof config.prices]

                return (
                  <Card
                    key={plan.tier}
                    variant={plan.highlighted ? 'raised' : 'default'}
                    className={`flex flex-col ${
                      isCurrent ? 'ring-2 ring-primary/40' : ''
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="mt-2">
                        <span className="text-2xl font-bold">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        <p>{plan.calls} calls/mo</p>
                        <p>{plan.rate}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="space-y-2.5 flex-1">
                        {plan.features.map((f) => (
                          <div key={f.label} className="flex items-start gap-2 text-sm">
                            {f.included ? (
                              <Check className="h-4 w-4 text-[color:var(--green)] mt-0.5 shrink-0" />
                            ) : (
                              <XIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <span className={f.included ? 'text-foreground' : 'text-muted-foreground'}>
                              {f.label}{f.value ? ` (${f.value})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6">
                        {isCurrent ? (
                          <Button variant="outline" className="w-full" disabled>
                            Current Plan
                          </Button>
                        ) : isEnterprise ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.location.href = 'mailto:sales@sentinelai.com'}
                          >
                            Contact Sales
                          </Button>
                        ) : (
                          <Button
                            variant={plan.ctaVariant}
                            className="w-full"
                            onClick={() => priceId ? handleCheckout(priceId, plan.tier) : toast.error('Plan not configured')}
                            disabled={actionLoading === plan.tier || !priceId}
                          >
                            {actionLoading === plan.tier ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Zap className="h-4 w-4" />
                            )}
                            {plan.cta}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invoice History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Invoice History</CardTitle>
            </div>
            <CardDescription>Your recent billing invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No invoices yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-3 px-4 rounded-lg bg-[color:var(--paper-sunken)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium tabular-nums">
                        {formatCurrency(inv.amount_due, inv.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                      </div>
                      <Badge variant={inv.status === 'paid' ? 'success' : 'secondary'}>
                        {inv.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(inv.created_at)}
                      </span>
                      {inv.invoice_url && (
                        <a
                          href={inv.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs flex items-center gap-1"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
