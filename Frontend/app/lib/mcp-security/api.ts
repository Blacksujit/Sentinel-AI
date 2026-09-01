/**
 * MCP Security API client — all fetch calls go through here.
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
  }): Promise<{ scans: MCPScanResult[] }> {
    const qs = new URLSearchParams()
    if (params?.server_name) qs.set('server_name', params.server_name)
    if (params?.tool_name) qs.set('tool_name', params.tool_name)
    if (params?.risk_level) qs.set('risk_level', params.risk_level)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    const q = qs.toString()
    return apiGet(`${BASE}/scans${q ? `?${q}` : ''}`)
  },

  async triggerScan(payload: {
    target: string
    scan_type: 'server' | 'tool'
    config_path?: string
    server_name?: string
    tool_name?: string
  }): Promise<{ status: string; job_id?: string }> {
    return apiPost(`${BASE}/scan`, payload)
  },

  // ── Agent Profiles ─────────────────────────────────────────────────

  async getAgents(params?: {
    status?: string
  }): Promise<{ agents: AgentProfile[] }> {
    const qs = params?.status ? `?status=${params.status}` : ''
    return apiGet(`${BASE}/agents${qs}`)
  },

  async getAgent(agentId: string): Promise<AgentProfile> {
    return apiGet(`${BASE}/agents/${agentId}`)
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
  }): Promise<{ id: number; agent_id: string; status: string }> {
    return apiPost(`${BASE}/agents`, profile)
  },

  async updateAgent(agentId: string, updates: {
    status?: string
    allowed_tools?: string[]
    denied_tools?: string[]
    max_calls_per_minute?: number
    max_calls_per_hour?: number
  }): Promise<{ status: string; agent_id: string }> {
    return apiPatch(`${BASE}/agents/${agentId}`, updates)
  },

  async deleteAgent(agentId: string): Promise<{ deleted: boolean; agent_id: string }> {
    return apiDelete(`${BASE}/agents/${agentId}`)
  },

  // ── Guardrail Decisions ────────────────────────────────────────────

  async getDecisions(params?: {
    agent_id?: string
    action?: string
    limit?: number
  }): Promise<{ decisions: GuardrailDecision[] }> {
    const qs = new URLSearchParams()
    if (params?.agent_id) qs.set('agent_id', params.agent_id)
    if (params?.action) qs.set('action', params.action)
    if (params?.limit) qs.set('limit', String(params.limit))
    const q = qs.toString()
    return apiGet(`${BASE}/decisions${q ? `?${q}` : ''}`)
  },

  // ── Threat Graph ───────────────────────────────────────────────────

  async getThreatGraph(): Promise<ThreatGraphData> {
    return apiGet(`${BASE}/threat-graph`)
  },

  // ── Alerts ─────────────────────────────────────────────────────────

  async getAlerts(params?: {
    status?: string
    severity?: string
    limit?: number
  }): Promise<{ alerts: SecurityAlert[] }> {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.limit) qs.set('limit', String(params.limit))
    const q = qs.toString()
    return apiGet(`${BASE}/alerts${q ? `?${q}` : ''}`)
  },

  async acknowledgeAlert(alertId: number, notes?: string): Promise<{ acknowledged: boolean }> {
    return apiPost(`${BASE}/alerts/${alertId}/acknowledge`, { notes })
  },

  async resolveAlert(alertId: number, notes?: string): Promise<{ resolved: boolean }> {
    return apiPost(`${BASE}/alerts/${alertId}/resolve`, { notes })
  },

  // ── Dashboard ──────────────────────────────────────────────────────

  async getDashboard(): Promise<SecurityDashboard> {
    return apiGet(`${BASE}/dashboard`)
  },

  // ── Config Watcher ─────────────────────────────────────────────────

  async getConfigWatcherStatus(): Promise<ConfigWatcherStatus> {
    return apiGet(`${BASE}/config-watcher/status`)
  },

  async addWatchPath(path: string): Promise<{ added: string }> {
    return apiPost(`${BASE}/config-watcher/watch`, { path })
  },

  async removeWatchPath(path: string): Promise<{ removed: string }> {
    return apiDelete(`${BASE}/config-watcher/watch/${encodeURIComponent(path)}`)
  },
}
