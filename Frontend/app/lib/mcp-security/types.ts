/**
 * Type definitions for MCP Security feature.
 * Matches the backend Pydantic models from mcp_security_routes.py
 */

export interface SecurityFinding {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  recommendation?: string
  cwe_id?: string
  rule_id?: string
  location?: {
    file: string
    line?: number
  }
}

export interface MCPScanResult {
  id: number
  tool_name: string
  server_name?: string
  scan_type: 'server' | 'tool' | 'config' | 'all'
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'info'
  risk_score: number
  findings: SecurityFinding[]
  finding_count: number
  created_at: string
  completed_at?: string
}

export interface AgentProfile {
  agent_id: string
  agent_name?: string
  allowed_tools: string[]
  denied_tools: string[]
  allowed_data_sources: string[]
  denied_data_sources: string[]
  max_calls_per_minute: number
  max_calls_per_hour: number
  trusted_agents: string[]
  can_delegate: boolean
  status: 'active' | 'blocked' | 'monitoring' | 'inactive'
  created_at: string
  updated_at: string
}

export interface GuardrailDecision {
  id: number
  agent_id: string
  tool_name: string
  action: 'allow' | 'block' | 'warn' | 'escalate' | 'log'
  reason: string
  risk_score: number
  context?: Record<string, unknown>
  created_at: string
}

export interface ThreatNode {
  id: string
  label: string
  type: 'server' | 'tool' | 'agent' | 'data_source'
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'info'
}

export interface ThreatEdge {
  source: string
  target: string
  relationship: string
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'info'
}

export interface ThreatGraphData {
  nodes: ThreatNode[]
  edges: ThreatEdge[]
}

export interface SecurityAlert {
  id: number
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  status: 'active' | 'acknowledged' | 'resolved'
  source_type: string
  source_id: string
  created_at: string
  acknowledged_at?: string
  resolved_at?: string
  metadata?: Record<string, unknown>
}

export interface SecuritySummary {
  total_scans: number
  critical_findings: number
  high_findings: number
  active_agents: number
  blocked_agents: number
  unacknowledged_alerts: number
}

export interface RiskDistribution {
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

export interface SecurityDashboard {
  summary: SecuritySummary
  risk_distribution: RiskDistribution
}

export interface ConfigWatcherStatus {
  is_watching: boolean
  watched_paths: string[]
  poll_interval: number
  last_check?: string
}

export interface WebSocketMessage {
  type: 'scan_finding' | 'guardrail_decision' | 'config_change' | 'anomaly' | 'alert'
  payload: Record<string, unknown>
  timestamp: number
}