/**
 * TypeScript types for the Workspace Intelligence System.
 * Mirrors the backend models for end-to-end type safety.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────────

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IncidentStatus = 'DETECTED' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED' | 'POSTMORTEM'
export type IncidentSource = 'SLACK' | 'GITHUB' | 'ANOMALY' | 'MANUAL' | 'ESCALATION' | 'DEPLOYMENT' | 'ALERT'
export type DeploymentStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK'
export type TimelineEventType =
  | 'PR_MERGED' | 'PR_RISK_DETECTED'
  | 'DEPLOYMENT_STARTED' | 'DEPLOYMENT_COMPLETED' | 'DEPLOYMENT_FAILED' | 'DEPLOYMENT_ROLLED_BACK'
  | 'INCIDENT_CREATED' | 'INCIDENT_RESOLVED' | 'INCIDENT_ESCALATED'
  | 'ANOMALY_DETECTED' | 'RISK_INCREASED' | 'ALERT_TRIGGERED'
  | 'SLACK_ESCALATION' | 'ROLLBACK_TRIGGERED'
  | 'MEMBER_JOINED' | 'INTEGRATION_ADDED'
  | 'AI_SUMMARY_GENERATED' | 'POSTMORTEM_CREATED'
export type TimelineSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type MemoryType = 'INCIDENT_PATTERN' | 'ROOT_CAUSE' | 'KNOWN_FIX' | 'DEPLOYMENT_PATTERN' | 'RECURRING_FAILURE' | 'SERVICE_RISK' | 'DECISION_LOG'
export type SummaryType = 'DAILY' | 'WEEKLY' | 'INCIDENT' | 'DEPLOYMENT' | 'EXECUTIVE'
export type ActivityType =
  | 'INCIDENT_CREATED' | 'INCIDENT_UPDATED' | 'INCIDENT_RESOLVED'
  | 'DEPLOYMENT_STARTED' | 'DEPLOYMENT_COMPLETED' | 'DEPLOYMENT_FAILED'
  | 'MEMBER_ADDED' | 'MEMBER_REMOVED'
  | 'INTEGRATION_ADDED' | 'INTEGRATION_REMOVED'
  | 'SETTINGS_CHANGED' | 'ESCALATION_TRIGGERED'
  | 'AI_INSIGHT' | 'POSTMORTEM_CREATED' | 'SUMMARY_GENERATED'
export type IntegrationProvider = 'SLACK' | 'GITHUB' | 'PAGERDUTY' | 'DATADOG' | 'JIRA' | 'OPSGENIE'
export type AgentType = 'DEPLOYMENT' | 'SECURITY' | 'RELIABILITY' | 'EXECUTIVE' | 'INCIDENT_COMMANDER'

// ─── Domain Models ──────────────────────────────────────────────────────────────

export interface Incident {
  id: number
  workspace_id: number
  title: string
  description: string | null
  severity: IncidentSeverity
  status: IncidentStatus
  source: IncidentSource
  detected_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  assignee_id: number | null
  reporter_id: number | null
  root_cause: string | null
  impact: string | null
  resolution: string | null
  affected_services: string[]
  slack_channel_name: string | null
  created_at: string
  updated_at: string | null
}

export interface Deployment {
  id: number
  workspace_id: number
  service_name: string
  environment: string
  version: string
  commit_sha: string | null
  branch: string | null
  repository: string | null
  status: DeploymentStatus
  triggered_by: string | null
  duration_seconds: number | null
  risk_score: number | null
  risk_factors: string[]
  rollback_reason: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface TimelineEvent {
  id: number
  event_type: TimelineEventType
  title: string
  description: string | null
  severity: TimelineSeverity
  source: string
  source_id: string | null
  metadata: Record<string, unknown>
  related_entity_type: string | null
  related_entity_id: number | null
  ai_summary: string | null
  event_time: string
}

export interface TimelineGroup {
  time_start: string
  time_end: string
  event_count: number
  max_severity: TimelineSeverity
  events: TimelineEvent[]
}

export interface Integration {
  id: number
  provider: IntegrationProvider
  name: string
  description: string | null
  is_active: boolean
  last_sync_at: string | null
  last_error: string | null
  created_at: string
}

export interface AIMemory {
  id: number
  memory_type: MemoryType
  title: string
  content: string
  tags: string[]
  confidence: number | null
  source_incident_id: number | null
  created_at: string
}

export interface WorkspaceSummary {
  id: number
  summary_type: SummaryType
  title: string
  content: string
  generated_by: string
  period_start: string
  period_end: string
  created_at: string
}

export interface ActivityFeedItem {
  id: number
  activity_type: ActivityType
  title: string
  description: string | null
  actor_name: string | null
  related_entity_type: string | null
  related_entity_id: number | null
  metadata: Record<string, unknown>
  activity_time: string
}

export interface EscalationPolicy {
  id: number
  name: string
  trigger_type: string
  is_active: boolean
  created_at: string
}

export interface Postmortem {
  id: number
  incident_id: number
  title: string
  overview: string | null
  timeline: unknown[]
  impact: Record<string, unknown>
  root_cause: string | null
  resolution: string | null
  responders: unknown[]
  action_items: unknown[]
  lessons_learned: string[]
  time_to_detect_minutes: number | null
  time_to_resolve_minutes: number | null
  created_at: string
}

export interface IntelligenceSummary {
  active_incidents: number
  recent_events_7d: number
  recent_deployments_7d: number
  failed_deployments_7d: number
  critical_events_7d: number
  member_count: number
  memory_entries: number
  activities_today: number
  health_score: number
}

// ─── API Request Types ──────────────────────────────────────────────────────────

export interface CreateIncidentRequest {
  title: string
  description?: string
  severity?: IncidentSeverity
  source?: IncidentSource
  assignee_id?: number
  affected_services?: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateIncidentRequest {
  status?: IncidentStatus
  title?: string
  description?: string
  severity?: IncidentSeverity
  assignee_id?: number
  root_cause?: string
  resolution?: string
}

export interface CreateDeploymentRequest {
  service_name: string
  version: string
  environment?: string
  commit_sha?: string
  branch?: string
  repository?: string
  pull_request_url?: string
  triggered_by?: string
  changelog?: string
}

export interface UpdateDeploymentRequest {
  status: DeploymentStatus
  duration_seconds?: number
  risk_score?: number
  risk_factors?: string[]
  rollback_reason?: string
}

export interface StoreMemoryRequest {
  memory_type: MemoryType
  title: string
  content: string
  tags?: string[]
  metadata?: Record<string, unknown>
  confidence?: number
}
