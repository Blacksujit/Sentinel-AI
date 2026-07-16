/**
 * React Query hooks for workspace intelligence data fetching.
 * Provides auto-caching, background refetching, and optimistic updates.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import type {
  Incident, Deployment, TimelineEvent, TimelineGroup,
  Integration, AIMemory, WorkspaceSummary, ActivityFeedItem,
  IntelligenceSummary, Postmortem,
  CreateIncidentRequest, UpdateIncidentRequest,
  CreateDeploymentRequest, UpdateDeploymentRequest,
  StoreMemoryRequest,
} from '@/lib/workspace-intel/types'

export const intelKeys = {
  all: (workspaceId: string) => ['workspace-intel', workspaceId] as const,
  summary: (workspaceId: string) => [...intelKeys.all(workspaceId), 'summary'] as const,
  incidents: (workspaceId: string) => [...intelKeys.all(workspaceId), 'incidents'] as const,
  incident: (workspaceId: string, id: number) => [...intelKeys.incidents(workspaceId), id] as const,
  deployments: (workspaceId: string) => [...intelKeys.all(workspaceId), 'deployments'] as const,
  deployment: (workspaceId: string, id: number) => [...intelKeys.deployments(workspaceId), id] as const,
  timeline: (workspaceId: string) => [...intelKeys.all(workspaceId), 'timeline'] as const,
  groupedTimeline: (workspaceId: string) => [...intelKeys.timeline(workspaceId), 'grouped'] as const,
  integrations: (workspaceId: string) => [...intelKeys.all(workspaceId), 'integrations'] as const,
  memories: (workspaceId: string) => [...intelKeys.all(workspaceId), 'memory'] as const,
  summaries: (workspaceId: string) => [...intelKeys.all(workspaceId), 'summaries'] as const,
  activity: (workspaceId: string) => [...intelKeys.all(workspaceId), 'activity'] as const,
  postmortem: (workspaceId: string, incidentId: number) =>
    [...intelKeys.all(workspaceId), 'postmortem', incidentId] as const,
}

function useToken() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return { getToken, isReady: isLoaded && isSignedIn }
}

export function useIntelligenceSummary(workspaceId: string) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: intelKeys.summary(workspaceId),
    queryFn: async () => {
      const token = await getToken()
      return apiGet(`/api/workspaces/${workspaceId}/intel/summary`, token) as Promise<IntelligenceSummary>
    },
    enabled: isReady && !!workspaceId,
    refetchInterval: 60_000,
  })
}

export function useIncidents(workspaceId: string, params?: { status?: string; severity?: string }) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: [...intelKeys.incidents(workspaceId), params],
    queryFn: async () => {
      const token = await getToken()
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.severity) query.set('severity', params.severity)
      const qs = query.toString()
      return apiGet(
        `/api/workspaces/${workspaceId}/intel/incidents${qs ? `?${qs}` : ''}`,
        token,
      ) as Promise<Incident[]>
    },
    enabled: isReady && !!workspaceId,
  })
}

export function useCreateIncident(workspaceId: string) {
  const queryClient = useQueryClient()
  const { getToken } = useToken()
  return useMutation({
    mutationFn: async (req: CreateIncidentRequest) => {
      const token = await getToken()
      return apiPost(`/api/workspaces/${workspaceId}/intel/incidents`, req, token) as Promise<Incident>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelKeys.incidents(workspaceId) })
      queryClient.invalidateQueries({ queryKey: intelKeys.summary(workspaceId) })
    },
  })
}

export function useUpdateIncident(workspaceId: string) {
  const queryClient = useQueryClient()
  const { getToken } = useToken()
  return useMutation({
    mutationFn: async ({ id, ...req }: UpdateIncidentRequest & { id: number }) => {
      const token = await getToken()
      return apiPatch(`/api/workspaces/${workspaceId}/intel/incidents/${id}`, req, token) as Promise<Incident>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelKeys.incidents(workspaceId) })
      queryClient.invalidateQueries({ queryKey: intelKeys.summary(workspaceId) })
    },
  })
}

export function useDeployments(workspaceId: string, serviceName?: string) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: [...intelKeys.deployments(workspaceId), serviceName],
    queryFn: async () => {
      const token = await getToken()
      const qs = serviceName ? `?service_name=${encodeURIComponent(serviceName)}` : ''
      return apiGet(`/api/workspaces/${workspaceId}/intel/deployments${qs}`, token) as Promise<Deployment[]>
    },
    enabled: isReady && !!workspaceId,
  })
}

export function useCreateDeployment(workspaceId: string) {
  const queryClient = useQueryClient()
  const { getToken } = useToken()
  return useMutation({
    mutationFn: async (req: CreateDeploymentRequest) => {
      const token = await getToken()
      return apiPost(`/api/workspaces/${workspaceId}/intel/deployments`, req, token) as Promise<Deployment>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelKeys.deployments(workspaceId) })
      queryClient.invalidateQueries({ queryKey: intelKeys.summary(workspaceId) })
    },
  })
}

export function useUpdateDeployment(workspaceId: string) {
  const queryClient = useQueryClient()
  const { getToken } = useToken()
  return useMutation({
    mutationFn: async ({ id, ...req }: UpdateDeploymentRequest & { id: number }) => {
      const token = await getToken()
      return apiPatch(`/api/workspaces/${workspaceId}/intel/deployments/${id}`, req, token) as Promise<Deployment>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelKeys.deployments(workspaceId) })
    },
  })
}

export function useTimeline(workspaceId: string, params?: {
  event_types?: string
  severity?: string
  since?: string
  limit?: number
}) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: [...intelKeys.timeline(workspaceId), params],
    queryFn: async () => {
      const token = await getToken()
      const query = new URLSearchParams()
      if (params?.event_types) query.set('event_types', params.event_types)
      if (params?.severity) query.set('severity', params.severity)
      if (params?.since) query.set('since', params.since)
      if (params?.limit) query.set('limit', String(params.limit))
      const qs = query.toString()
      return apiGet(
        `/api/workspaces/${workspaceId}/intel/timeline${qs ? `?${qs}` : ''}`,
        token,
      ) as Promise<TimelineEvent[]>
    },
    enabled: isReady && !!workspaceId,
    refetchInterval: 30_000,
  })
}

export function useGroupedTimeline(workspaceId: string, groupWindow?: number) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: [...intelKeys.groupedTimeline(workspaceId), groupWindow],
    queryFn: async () => {
      const token = await getToken()
      const qs = groupWindow ? `?group_window=${groupWindow}` : ''
      return apiGet(
        `/api/workspaces/${workspaceId}/intel/timeline/grouped${qs}`,
        token,
      ) as Promise<TimelineGroup[]>
    },
    enabled: isReady && !!workspaceId,
    refetchInterval: 30_000,
  })
}

export function useIntegrations(workspaceId: string) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: intelKeys.integrations(workspaceId),
    queryFn: async () => {
      const token = await getToken()
      return apiGet(`/api/workspaces/${workspaceId}/intel/integrations`, token) as Promise<Integration[]>
    },
    enabled: isReady && !!workspaceId,
  })
}

export function useMemories(workspaceId: string, params?: { memory_type?: string; query?: string }) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: [...intelKeys.memories(workspaceId), params],
    queryFn: async () => {
      const token = await getToken()
      const query = new URLSearchParams()
      if (params?.memory_type) query.set('memory_type', params.memory_type)
      if (params?.query) query.set('query', params.query)
      const qs = query.toString()
      return apiGet(
        `/api/workspaces/${workspaceId}/intel/memory${qs ? `?${qs}` : ''}`,
        token,
      ) as Promise<AIMemory[]>
    },
    enabled: isReady && !!workspaceId,
  })
}

export function useStoreMemory(workspaceId: string) {
  const queryClient = useQueryClient()
  const { getToken } = useToken()
  return useMutation({
    mutationFn: async (req: StoreMemoryRequest) => {
      const token = await getToken()
      return apiPost(`/api/workspaces/${workspaceId}/intel/memory`, req, token) as Promise<AIMemory>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelKeys.memories(workspaceId) })
    },
  })
}

export function useFindSimilarIncidents(workspaceId: string) {
  const { getToken } = useToken()
  return useMutation({
    mutationFn: async (description: string) => {
      const token = await getToken()
      return apiGet(
        `/api/workspaces/${workspaceId}/intel/memory/similar?description=${encodeURIComponent(description)}`,
        token,
      )
    },
  })
}

export function useActivityFeed(workspaceId: string, limit?: number) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: [...intelKeys.activity(workspaceId), limit],
    queryFn: async () => {
      const token = await getToken()
      const qs = limit ? `?limit=${limit}` : ''
      return apiGet(`/api/workspaces/${workspaceId}/intel/activity${qs}`, token) as Promise<ActivityFeedItem[]>
    },
    enabled: isReady && !!workspaceId,
    refetchInterval: 15_000,
  })
}

export function usePostmortem(workspaceId: string, incidentId: number) {
  const { getToken, isReady } = useToken()
  return useQuery({
    queryKey: intelKeys.postmortem(workspaceId, incidentId),
    queryFn: async () => {
      const token = await getToken()
      return apiGet(
        `/api/workspaces/${workspaceId}/intel/incidents/${incidentId}/postmortem`,
        token,
      ) as Promise<Postmortem>
    },
    enabled: isReady && !!workspaceId && !!incidentId,
  })
}

export function useCreatePostmortem(workspaceId: string) {
  const queryClient = useQueryClient()
  const { getToken } = useToken()
  return useMutation({
    mutationFn: async (incidentId: number) => {
      const token = await getToken()
      return apiPost(
        `/api/workspaces/${workspaceId}/intel/incidents/${incidentId}/postmortem`,
        {},
        token,
      ) as Promise<Postmortem>
    },
    onSuccess: (_, incidentId) => {
      queryClient.invalidateQueries({ queryKey: intelKeys.postmortem(workspaceId, incidentId) })
    },
  })
}
