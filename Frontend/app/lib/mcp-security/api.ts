/**
 * MCP Security API client — all fetch calls go through here.
 * Every method accepts an optional Clerk JWT token and forwards it
 * to the Next.js proxy, which relays it to the FastAPI backend.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import type {
  MCPScanResult,
  AgentProfile,
  GuardrailDecision,
  ThreatGraphData,
  SecurityAlert,
  SecurityDashboard,
  ConfigWatcherStatus,
} from './types'

const BASE = '/api/mcp-security'

// ── Scans ──────────────────────────────────────────────────────────────

export const mcpSecurityApi = {
  async getScans(params?: {
    server_name?: string
    tool_name?: string
    risk_level?: string
    limit?: number
    offset?: number
  }, token?: string | null): Promise<{ scans: MCPScanResult[] }> {
    const qs = new URLSearchParams()
    if (params?.server_name) qs.set('server_name', params.server_name)
    if (params?.tool_name) qs.set('tool_name', params.tool_name)
    if (params?.risk_level) qs.set('risk_level', params.risk_level)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    const q = qs.toString()
    return apiGet(`${BASE}/scans${q ? `?${q}` : ''}`, token)
  },

  async triggerScan(payload: {
    target: string
    scan_type: 'server' | 'tool'
    config_path?: string
    server_name?: string
    tool_name?: string
  }, token?: string | null): Promise<{ status: string; job_id?: string }> {
    return apiPost(`${BASE}/scan`, payload, token)
  },

  // ── Agent Profiles ─────────────────────────────────────────────────

  async getAgents(params?: {
    status?: string
  }, token?: string | null): Promise<{ agents: AgentProfile[] }> {
    const qs = params?.status ? `?status=${params.status}` : ''
    return apiGet(`${BASE}/agents${qs}`, token)
  },

  async getAgent(agentId: string, token?: string | null): Promise<AgentProfile> {
    return apiGet(`${BASE}/agents/${agentId}`, token)
  },

  async createAgent(profile: {
    agent_id: string
    agent_name?: string
    allowed_tools?: string[]
    denied_tools?: string[]
    allowed_data_sources?: string[]
    denied_data_sources?: string[]
    max_calls_per_minute?: number
    max_calls_per_hour?: number
    trusted_agents?: string[]
    can_delegate?: boolean
  }, token?: string | null): Promise<{ id: number; agent_id: string; status: string }> {
    return apiPost(`${BASE}/agents`, profile, token)
  },

  async updateAgent(agentId: string, updates: {
    status?: string
    allowed_tools?: string[]
    denied_tools?: string[]
    max_calls_per_minute?: number
    max_calls_per_hour?: number
  }, token?: string | null): Promise<{ status: string; agent_id: string }> {
    return apiPatch(`${BASE}/agents/${agentId}`, updates, token)
  },

  async deleteAgent(agentId: string, token?: string | null): Promise<{ deleted: boolean; agent_id: string }> {
    return apiDelete(`${BASE}/agents/${agentId}`, token)
  },

  // ── Guardrail Decisions ────────────────────────────────────────────

  async getDecisions(params?: {
    agent_id?: string
    action?: string
    limit?: number
  }, token?: string | null): Promise<{ decisions: GuardrailDecision[] }> {
    const qs = new URLSearchParams()
    if (params?.agent_id) qs.set('agent_id', params.agent_id)
    if (params?.action) qs.set('action', params.action)
    if (params?.limit) qs.set('limit', String(params.limit))
    const q = qs.toString()
    return apiGet(`${BASE}/decisions${q ? `?${q}` : ''}`, token)
  },

  // ── Threat Graph ───────────────────────────────────────────────────

  async getThreatGraph(token?: string | null): Promise<ThreatGraphData> {
    return apiGet(`${BASE}/threat-graph`, token)
  },

  // ── Alerts ─────────────────────────────────────────────────────────

  async getAlerts(params?: {
    severity?: string
    status?: string
    limit?: number
    offset?: number
  }, token?: string | null): Promise<{ alerts: SecurityAlert[] }> {
    const qs = new URLSearchParams()
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.status) qs.set('status', params.status)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    const q = qs.toString()
    return apiGet(`${BASE}/alerts${q ? `?${q}` : ''}`, token)
  },

  async acknowledgeAlert(alertId: number | string, notes?: string, token?: string | null): Promise<SecurityAlert> {
    return apiPost(`${BASE}/alerts/${alertId}/acknowledge`, { notes }, token)
  },

  async resolveAlert(alertId: number | string, notes?: string, token?: string | null): Promise<SecurityAlert> {
    return apiPost(`${BASE}/alerts/${alertId}/resolve`, { notes }, token)
  },

  // ── Dashboard ──────────────────────────────────────────────────────

  async getDashboard(token?: string | null): Promise<SecurityDashboard> {
    return apiGet(`${BASE}/dashboard`, token)
  },

  // ── Config Watcher ────────────────────────────────────────────────

  async getConfigWatcherStatus(token?: string | null): Promise<ConfigWatcherStatus> {
    return apiGet(`${BASE}/config-watcher/status`, token)
  },

  async addWatchPath(path: string, token?: string | null): Promise<{ status: string; path: string }> {
    return apiPost(`${BASE}/config-watcher/watch`, { path }, token)
  },

  async removeWatchPath(path: string, token?: string | null): Promise<{ status: string; path: string }> {
    return apiDelete(`${BASE}/config-watcher/watch/${encodeURIComponent(path)}`, token)
  },
}
