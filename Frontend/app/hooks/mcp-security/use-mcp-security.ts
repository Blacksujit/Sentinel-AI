/**
 * React Query hooks for MCP Security data.
 * Auto-caches, background-refetches, and provides optimistic updates.
 *
 * FIX: Every query/mutation now passes the Clerk JWT through to the API
 * client, which forwards it to the Next.js proxy → FastAPI backend.
 * Previously, tokens were fetched but never sent, causing 401s in prod.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { mcpSecurityApi } from '@/lib/mcp-security/api'
import type {
  MCPScanResult,
  AgentProfile,
  GuardrailDecision,
  ThreatGraphData,
  SecurityAlert,
  SecurityDashboard,
  ConfigWatcherStatus,
  WebSocketMessage,
} from '@/lib/mcp-security/types'

// ── Query Key Factories ────────────────────────────────────────────────

export const mcpKeys = {
  all: ['mcp-security'] as const,
  scans: () => [...mcpKeys.all, 'scans'] as const,
  scansList: (params?: Record<string, unknown>) => [...mcpKeys.scans(), params] as const,
  agents: () => [...mcpKeys.all, 'agents'] as const,
  agent: (id: string) => [...mcpKeys.agents(), id] as const,
  decisions: (params?: Record<string, unknown>) => [...mcpKeys.all, 'decisions', params] as const,
  threatGraph: () => [...mcpKeys.all, 'threat-graph'] as const,
  alerts: (params?: Record<string, unknown>) => [...mcpKeys.all, 'alerts', params] as const,
  dashboard: () => [...mcpKeys.all, 'dashboard'] as const,
  configWatcher: () => [...mcpKeys.all, 'config-watcher'] as const,
}

// ── Token Helper ───────────────────────────────────────────────────────

function useToken() {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    getToken().then(setToken)
  }, [getToken])

  return token
}

// ── Scans ──────────────────────────────────────────────────────────────

export function useMCPSecurityScans(params?: {
  server_name?: string
  tool_name?: string
  risk_level?: string
  limit?: number
  offset?: number
}) {
  const token = useToken()
  const result = useQuery({
    queryKey: mcpKeys.scansList(params),
    queryFn: () => mcpSecurityApi.getScans(params, token),
    enabled: !!token,
    refetchInterval: 30000,
  })
  return { data: result.data, isLoading: result.isLoading, refetch: result.refetch }
}

export function useTriggerScan() {
  const queryClient = useQueryClient()
  const token = useToken()
  return useMutation({
    mutationFn: (payload: {
      target: string
      scan_type: 'server' | 'tool'
      config_path?: string
      server_name?: string
      tool_name?: string
    }) => mcpSecurityApi.triggerScan(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.scans() })
      queryClient.invalidateQueries({ queryKey: mcpKeys.dashboard() })
    },
  })
}

// ── Agent Profiles ─────────────────────────────────────────────────────

export function useMCPSecurityAgents(params?: { status?: string }) {
  const token = useToken()
  const result = useQuery({
    queryKey: mcpKeys.agents(),
    queryFn: () => mcpSecurityApi.getAgents(params, token),
    enabled: !!token,
    refetchInterval: 30000,
  })
  return { data: result.data, isLoading: result.isLoading, refetch: result.refetch }
}

export function useMCPAgent(agentId: string | null) {
  const token = useToken()
  const { data, isLoading } = useQuery({
    queryKey: mcpKeys.agent(agentId ?? ''),
    queryFn: () => mcpSecurityApi.getAgent(agentId!, token),
    enabled: !!token && !!agentId,
  })
  return { agent: data ?? null, isLoading }
}

export function useCreateAgent() {
  const queryClient = useQueryClient()
  const token = useToken()
  return useMutation({
    mutationFn: (profile: {
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
    }) => mcpSecurityApi.createAgent(profile, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.agents() })
      queryClient.invalidateQueries({ queryKey: mcpKeys.dashboard() })
    },
  })
}

export function useUpdateAgent() {
  const queryClient = useQueryClient()
  const token = useToken()
  return useMutation({
    mutationFn: ({ agentId, updates }: {
      agentId: string
      updates: {
        status?: string
        allowed_tools?: string[]
        denied_tools?: string[]
        max_calls_per_minute?: number
        max_calls_per_hour?: number
      }
    }) => mcpSecurityApi.updateAgent(agentId, updates, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.agents() })
    },
  })
}

export function useDeleteAgent() {
  const queryClient = useQueryClient()
  const token = useToken()
  return useMutation({
    mutationFn: (agentId: string) => mcpSecurityApi.deleteAgent(agentId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.agents() })
      queryClient.invalidateQueries({ queryKey: mcpKeys.dashboard() })
    },
  })
}

// ── Guardrail Decisions ────────────────────────────────────────────────

export function useGuardrailDecisions(params?: {
  agent_id?: string
  action?: string
  limit?: number
}) {
  const token = useToken()
  const result = useQuery({
    queryKey: mcpKeys.decisions(params),
    queryFn: () => mcpSecurityApi.getDecisions(params, token),
    enabled: !!token,
    refetchInterval: 30000,
  })
  return { data: result.data, isLoading: result.isLoading, refetch: result.refetch }
}

// ── Threat Graph ───────────────────────────────────────────────────────

export function useThreatGraph() {
  const token = useToken()
  const result = useQuery({
    queryKey: mcpKeys.threatGraph(),
    queryFn: () => mcpSecurityApi.getThreatGraph(token),
    enabled: !!token,
    refetchInterval: 60000,
  })
  return { data: result.data, isLoading: result.isLoading, refetch: result.refetch }
}

// ── Alerts ─────────────────────────────────────────────────────────────

export function useMCPSecurityAlerts(params?: {
  severity?: string
  status?: string
  limit?: number
  offset?: number
}) {
  const token = useToken()
  const result = useQuery({
    queryKey: mcpKeys.alerts(params),
    queryFn: () => mcpSecurityApi.getAlerts(params, token),
    enabled: !!token,
    refetchInterval: 15000,
  })
  return { data: result.data, isLoading: result.isLoading, refetch: result.refetch }
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()
  const token = useToken()
  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: number | string; notes?: string }) =>
      mcpSecurityApi.acknowledgeAlert(alertId, notes, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.all })
    },
  })
}

export function useResolveAlert() {
  const queryClient = useQueryClient()
  const token = useToken()
  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: number | string; notes?: string }) =>
      mcpSecurityApi.resolveAlert(alertId, notes, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.all })
    },
  })
}

// ── Dashboard ──────────────────────────────────────────────────────────

export function useSecurityDashboard() {
  const token = useToken()
  const result = useQuery({
    queryKey: mcpKeys.dashboard(),
    queryFn: () => mcpSecurityApi.getDashboard(token),
    enabled: !!token,
    refetchInterval: 30000,
  })
  return { data: result.data, isLoading: result.isLoading, refetch: result.refetch }
}

// ── Config Watcher ─────────────────────────────────────────────────────

export function useConfigWatcherStatus() {
  const token = useToken()
  const result = useQuery({
    queryKey: mcpKeys.configWatcher(),
    queryFn: () => mcpSecurityApi.getConfigWatcherStatus(token),
    enabled: !!token,
    refetchInterval: 15000,
  })
  return { data: result.data, isLoading: result.isLoading, refetch: result.refetch }
}

export function useAddWatchPath() {
  const queryClient = useQueryClient()
  const token = useToken()
  return useMutation({
    mutationFn: (path: string) => mcpSecurityApi.addWatchPath(path, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.configWatcher() })
    },
  })
}

export function useRemoveWatchPath() {
  const queryClient = useQueryClient()
  const token = useToken()
  return useMutation({
    mutationFn: (path: string) => mcpSecurityApi.removeWatchPath(path, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.configWatcher() })
    },
  })
}

// ── WebSocket ──────────────────────────────────────────────────────────

/**
 * Real-time WebSocket for MCP Security events.
 * FIX: Now passes the Clerk JWT as a query parameter so the backend
 * can authenticate the WS connection (browser WS API cannot set headers).
 * Falls back gracefully if token is unavailable (shows "disconnected").
 */
export function useMCPWebSocket(onMessage?: (msg: WebSocketMessage) => void) {
  const { getToken } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(async () => {
    const token = await getToken()
    // Connect directly to the backend WS — Next.js App Router cannot proxy WebSockets.
    // NEXT_PUBLIC_API_URL is the FastAPI backend origin (e.g. https://sentinelai-backend.onrender.com).
    const backendBase = process.env.NEXT_PUBLIC_API_URL || window.location.origin
    const wsProtocol = backendBase.startsWith('https') ? 'wss:' : 'ws:'
    const wsHost = backendBase.replace(/^https?:\/\//, '')
    const base = `${wsProtocol}//${wsHost}/api/mcp-security/ws`
    const url = token ? `${base}?token=${encodeURIComponent(token)}` : base
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setConnected(true)
      wsRef.current = ws
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WebSocketMessage
        setLastMessage(msg)
        onMessage?.(msg)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      // Reconnect after 5 seconds
      reconnectRef.current = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [getToken, onMessage])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { lastMessage, connected, send }
}
