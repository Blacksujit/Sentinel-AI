/** Analysis result from the SentinelAI API */
export interface AnalyzeResponse {
  decision: 'allow' | 'warn' | 'block' | 'escalate'
  final_risk_score: number
  flags?: string[]
  action_taken?: string
  error?: string
  fallback?: boolean
}

/** One-shot verify response (simplified) */
export interface VerifyResponse {
  score: number
  status: 'trusted' | 'needs_review' | 'hallucinated'
  decision: string
  action_taken: string
  claims: Claim[]
  corrected: string | null
  meta: {
    claims_checked: number
    detectors_run: number
    verified_at: string
  }
}

/** A detected claim/fact from analysis */
export interface Claim {
  detector: string
  text: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: 'prompt' | 'response'
  note: string
}

/** Risk log entry */
export interface RiskLogEntry {
  id: number
  prompt: string
  response: string
  final_risk_score: number
  decision: string
  flags: string[]
  created_at: string
  source?: string
}

/** Organization details */
export interface Organization {
  id: number
  clerk_org_id: string
  name: string
  slug: string
  plan_tier: 'free' | 'pro' | 'team' | 'enterprise'
  created_at: string
}

/** API key details */
export interface ApiKey {
  id: number
  name: string
  prefix: string
  status: 'active' | 'revoked'
  created_at: string | null
  last_used_at: string | null
}

/** Member details */
export interface Member {
  user_id: number
  name: string
  email: string
  role: string
  joined_at: string
}

/** Usage stats */
export interface UsageStats {
  total_requests: number
  requests_24h: number
  success_rate: number
  error_rate: number
  avg_latency_ms: number | null
}

/** Billing config */
export interface BillingConfig {
  stripe_publishable_key: string
  prices: {
    pro: string
    team: string
    enterprise: string
  }
}

/** Subscription details */
export interface Subscription {
  plan_tier: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

/** Billing usage */
export interface BillingUsage {
  used: number
  limit: number
  plan: string
  remaining: number
}

/** Invoice */
export interface Invoice {
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

/** Webhook config */
export interface WebhookConfig {
  id: string
  url: string
  events: string[]
  secret?: string
  created_at: string
}

/** SentinelAI client configuration */
export interface ClientConfig {
  baseUrl: string
  apiKey?: string
  source?: string
  timeout?: number
}

/** Analyze parameters */
export interface AnalyzeParams {
  prompt: string
  response: string
  userId?: string
  sessionId?: string
  clientMetadata?: Record<string, unknown>
}

/** Batch analyze item */
export interface BatchItem {
  prompt: string
  response: string
}
