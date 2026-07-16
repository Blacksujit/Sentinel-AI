import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  AnalyzeResponse,
  VerifyResponse,
  RiskLogEntry,
  Organization,
  ApiKey,
  Member,
  UsageStats,
  BillingConfig,
  Subscription,
  BillingUsage,
  Invoice,
  WebhookConfig,
  ClientConfig,
  AnalyzeParams,
  BatchItem,
} from './types'

export * from './types'

export class SentinelAIClient {
  private readonly client: AxiosInstance
  private readonly source: string

  constructor(config: ClientConfig) {
    const { baseUrl, apiKey, source = 'typescript-sdk', timeout = 10_000 } = config
    this.source = source

    this.client = axios.create({
      baseURL: baseUrl.replace(/\/+$/, ''),
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `SentinelAI-TypeScript-SDK/1.0.0 (${source})`,
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    })
  }

  // ── Core Analysis ────────────────────────────────────────────

  async analyze(params: AnalyzeParams): Promise<AnalyzeResponse> {
    const { prompt, response, userId, sessionId, clientMetadata } = params
    const payload: Record<string, unknown> = {
      prompt,
      response,
      source: this.source,
    }
    if (userId) payload.user_id = userId
    if (sessionId) payload.session_id = sessionId
    if (clientMetadata) payload.client_metadata = clientMetadata

    try {
      const res = await this.client.post<AnalyzeResponse>('/api/analyze', payload)
      return res.data
    } catch (err) {
      return this._handleError(err, 'analyze')
    }
  }

  async verify(prompt: string, response: string): Promise<VerifyResponse> {
    const result = await this.analyze({ prompt, response })
    return this._normalizeVerify(result, prompt)
  }

  private _normalizeVerify(result: AnalyzeResponse, prompt: string): VerifyResponse {
    const score = result.final_risk_score
    const status =
      score <= 30 ? 'trusted' : score <= 70 ? 'needs_review' : 'hallucinated'

    const corrected =
      status === 'hallucinated' ? `[Corrected] Response flagged by ${result.action_taken}.` : null

    return {
      score,
      status,
      decision: result.decision,
      action_taken: result.action_taken || 'none',
      claims: [],
      corrected,
      meta: {
        claims_checked: 0,
        detectors_run: 0,
        verified_at: new Date().toISOString(),
      },
    }
  }

  async correct(params: AnalyzeParams): Promise<{ corrected: string; original: AnalyzeResponse }> {
    const result = await this.analyze(params)
    const corrected =
      result.decision === 'block'
        ? '[Blocked] Response rejected by SentinelAI safety filters.'
        : params.response
    return { corrected, original: result }
  }

  // ── Batch Analysis ───────────────────────────────────────────

  async analyzeBatch(items: BatchItem[], concurrency = 5): Promise<AnalyzeResponse[]> {
    const results: AnalyzeResponse[] = []
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency)
      const promises = batch.map((item) => this.analyze(item))
      const batchResults = await Promise.allSettled(promises)
      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          results.push(r.value)
        }
      }
    }
    return results
  }

  // ── Risk Log ─────────────────────────────────────────────────

  async getRiskLog(orgId: string | number, limit = 50, offset = 0): Promise<RiskLogEntry[]> {
    try {
      const res = await this.client.get<RiskLogEntry[]>('/api/risk-log', {
        params: { org_id: orgId, limit, offset },
      })
      return res.data
    } catch {
      return []
    }
  }

  async getRiskLogStats(orgId: string | number): Promise<UsageStats> {
    try {
      const res = await this.client.get<UsageStats>('/api/risk-log/stats', {
        params: { org_id: orgId },
      })
      return res.data
    } catch {
      return { total_requests: 0, requests_24h: 0, success_rate: 0, error_rate: 0, avg_latency_ms: null }
    }
  }

  // ── Organizations ────────────────────────────────────────────

  async listOrganizations(clerkOrgId: string): Promise<Organization[]> {
    try {
      const res = await this.client.get<Organization[]>('/api/orgs', {
        params: { clerk_org_id: clerkOrgId },
      })
      return res.data
    } catch {
      return []
    }
  }

  async getOrganization(orgId: string | number): Promise<Organization | null> {
    try {
      const res = await this.client.get<Organization>(`/api/orgs/${orgId}`)
      return res.data
    } catch {
      return null
    }
  }

  // ── API Keys ─────────────────────────────────────────────────

  async listApiKeys(orgId: string | number): Promise<ApiKey[]> {
    try {
      const res = await this.client.get<ApiKey[]>(`/api/orgs/${orgId}/keys`)
      return res.data
    } catch {
      return []
    }
  }

  async createApiKey(orgId: string | number, name: string): Promise<ApiKey & { key: string }> {
    const res = await this.client.post(`/api/orgs/${orgId}/keys`, { name })
    return res.data
  }

  async revokeApiKey(orgId: string | number, keyId: string | number): Promise<boolean> {
    try {
      await this.client.delete(`/api/orgs/${orgId}/keys/${keyId}`)
      return true
    } catch {
      return false
    }
  }

  // ── Members ──────────────────────────────────────────────────

  async listMembers(orgId: string | number): Promise<Member[]> {
    try {
      const res = await this.client.get<Member[]>(`/api/orgs/${orgId}/members`)
      return res.data
    } catch {
      return []
    }
  }

  // ── Webhook Management ───────────────────────────────────────

  async createWebhook(orgId: string | number, url: string, events: string[]): Promise<WebhookConfig> {
    const res = await this.client.post<WebhookConfig>(`/api/orgs/${orgId}/webhooks`, { url, events })
    return res.data
  }

  async listWebhooks(orgId: string | number): Promise<WebhookConfig[]> {
    try {
      const res = await this.client.get<WebhookConfig[]>(`/api/orgs/${orgId}/webhooks`)
      return res.data
    } catch {
      return []
    }
  }

  async deleteWebhook(orgId: string | number, webhookId: string): Promise<boolean> {
    try {
      await this.client.delete(`/api/orgs/${orgId}/webhooks/${webhookId}`)
      return true
    } catch {
      return false
    }
  }

  // ── Billing ──────────────────────────────────────────────────

  async getBillingConfig(): Promise<BillingConfig | null> {
    try {
      const res = await this.client.get<BillingConfig>('/api/billing/config')
      return res.data
    } catch {
      return null
    }
  }

  async getSubscription(orgId: string | number): Promise<Subscription | null> {
    try {
      const res = await this.client.get<Subscription>('/api/billing/subscription', {
        params: { org_id: orgId },
      })
      return res.data
    } catch {
      return null
    }
  }

  async getBillingUsage(orgId: string | number): Promise<BillingUsage | null> {
    try {
      const res = await this.client.get<BillingUsage>('/api/billing/usage', {
        params: { org_id: orgId },
      })
      return res.data
    } catch {
      return null
    }
  }

  async listInvoices(orgId: string | number): Promise<Invoice[]> {
    try {
      const res = await this.client.get<Invoice[]>('/api/billing/invoices', {
        params: { org_id: orgId },
      })
      return res.data
    } catch {
      return []
    }
  }

  async createCheckoutSession(orgId: string | number, priceId: string): Promise<string | null> {
    try {
      const res = await this.client.post<{ url: string }>('/api/billing/create-checkout-session', {
        org_id: orgId,
        price_id: priceId,
      })
      return res.data.url
    } catch {
      return null
    }
  }

  async createPortalSession(orgId: string | number): Promise<string | null> {
    try {
      const res = await this.client.post<{ url: string }>('/api/billing/create-portal-session', {
        org_id: orgId,
      })
      return res.data.url
    } catch {
      return null
    }
  }

  // ── Health ───────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/health')
      return true
    } catch {
      return false
    }
  }

  // ── Internal ─────────────────────────────────────────────────

  private _handleError(err: unknown, context: string): never {
    if (err instanceof AxiosError) {
      if (err.response?.status === 401) {
        throw new Error('SentinelAI: Invalid API key')
      }
      if (err.response) {
        throw new Error(`SentinelAI API error ${err.response.status}: ${JSON.stringify(err.response.data)}`)
      }
      if (err.code === 'ECONNABORTED') {
        throw new Error('SentinelAI: Request timeout')
      }
      throw new Error(`SentinelAI: Network error - ${err.message}`)
    }
    throw err
  }
}
