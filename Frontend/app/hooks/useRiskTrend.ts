'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiGet } from '@/lib/api-client'
import type { RiskTrendPoint } from '@/charts/RiskTrendChart'

export interface RiskTrendResponse extends Array<RiskTrendPoint> {}

/**
 * Fetches the 30-day risk trend for an org.
 * Calls GET /api/orgs/{orgId}/usage/trend?days=30
 */
export function useRiskTrend(orgId: string, days = 30) {
  const { getToken } = useAuth()

  return useQuery<RiskTrendPoint[]>({
    queryKey: ['riskTrend', orgId, days],
    queryFn: async () => {
      const token = await getToken()
      const result = await apiGet<RiskTrendPoint[]>(
        `/api/orgs/${orgId}/usage/trend?days=${days}`,
        token,
      )
      return Array.isArray(result) ? result : []
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(orgId),
  })
}
