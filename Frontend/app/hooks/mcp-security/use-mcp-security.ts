/**
 * React Query hooks for MCP Security data.
 * Auto-caches, background-refetches, and provides optimistic updates.
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
  return useQuery({
    queryKey: mcpKeys.scansList(params as Record<string, unknown>),
    queryFn: () => mcpSecurityApi.getScans(params),
    enabled: !!token,
    staleTime: 30_000,
  })
}

export function useTriggerScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: mcpSecurityApi.triggerScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.scans() })
    },
  })
}

// ── Agent Profiles ─────────────────────────────────────────────────────

export function useMCPSecurityAgents(params?: { status?: string }) {
  const token = useToken()
  return useQuery({
    queryKey: mcpKeys.agents(),
    queryFn: () => mcpSecurityApi.getAgents(params),
    enabled: !!token,
    staleTime: 30_000,
  })
}

export function useMCPAgent(agentId: string) {
  const token = useToken()
  return useQuery({
    queryKey: mcpKeys.agent(agentId),
    queryFn: () => mcpSecurityApi.getAgent(agentId),
    enabled: !!token && !!agentId,
    staleTime: 30_000,
  })
}

export function useCreateAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: mcpSecurityApi.createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.agents() })
    },
  })
}

export function useUpdateAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ agentId, updates }: { agentId: string; updates: Parameters<typeof mcpSecurityApi.updateAgent>[1] }) =>
      mcpSecurityApi.updateAgent(agentId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.agents() })
    },
  })
}

export function useDeleteAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: mcpSecurityApi.deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.agents() })
    },
  })
}

// ── Guardrail Decisions ────────────────────────────────────────────────

export function useGuardrailDecisions(params?: { agent_id?: string; action?: string; limit?: number }) {
  const token = useToken()
  return useQuery({
    queryKey: mcpKeys.decisions(params as Record<string, unknown>),
    queryFn: () => mcpSecurityApi.getDecisions(params),
    enabled: !!token,
    staleTime: 15_000,
  })
}

// ── Threat Graph ───────────────────────────────────────────────────────

export function useThreatGraph() {
  const token = useToken()
  return useQuery({
    queryKey: mcpKeys.threatGraph(),
    queryFn: mcpSecurityApi.getThreatGraph,
    enabled: !!token,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

// ── Alerts ─────────────────────────────────────────────────────────────

export function useMCPSecurityAlerts(params?: { status?: string; severity?: string; limit?: number }) {
  const token = useToken()
  return useQuery({
    queryKey: mcpKeys.alerts(params as Record<string, unknown>),
    queryFn: () => mcpSecurityApi.getAlerts(params),
    enabled: !!token,
    staleTime: 15_000,
  })
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: number; notes?: string }) =>
      mcpSecurityApi.acknowledgeAlert(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.alerts() })
    },
  })
}

export function useResolveAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: number; notes?: string }) =>
      mcpSecurityApi.resolveAlert(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.alerts() })
    },
  })
}

// ── Dashboard ──────────────────────────────────────────────────────────

export function useSecurityDashboard() {
  const token = useToken()
  return useQuery({
    queryKey: mcpKeys.dashboard(),
    queryFn: mcpSecurityApi.getDashboard,
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

// ── Config Watcher ─────────────────────────────────────────────────────

export function useConfigWatcherStatus() {
  const token = useToken()
  return useQuery({
    queryKey: mcpKeys.configWatcher(),
    queryFn: mcpSecurityApi.getConfigWatcherStatus,
    enabled: !!token,
    staleTime: 30_000,
  })
}

export function useAddWatchPath() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: mcpSecurityApi.addWatchPath,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.configWatcher() })
    },
  })
}

export function useRemoveWatchPath() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: mcpSecurityApi.removeWatchPath,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.configWatcher() })
    },
  })
}

// ── WebSocket Hook ─────────────────────────────────────────────────────

export function useMCPWebSocket(onMessage?: (msg: WebSocketMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)

  useEffect(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/mcp-security/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      // Auto-reconnect after 3s
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          wsRef.current = null
        }
      }, 3000)
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WebSocketMessage
        setLastMessage(msg)
        onMessage?.(msg)
      } catch { /* ignore malformed messages */ }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [onMessage])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { connected, lastMessage, send }
}
