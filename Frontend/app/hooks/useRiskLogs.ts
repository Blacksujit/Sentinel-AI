'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { getRiskLogs } from '../services/logs'

interface RiskLogFilters {
  decision?: string
  minRiskScore?: number
}

// Custom hook for fetching risk logs with client-side filtering
export function useRiskLogs(
  params: { limit?: number } = { limit: 50 },
  filters: RiskLogFilters = {}
) {
  const { getToken } = useAuth()
  
  return useQuery({
    queryKey: ['riskLogs', params, filters],
    queryFn: async () => {
      try {
        // Get Clerk session token for authentication
        const token = await getToken()
        const result = await getRiskLogs(params, token)
        
        // Apply client-side filtering
        let filteredLogs = [...result]
        
        // Filter by decision
        if (filters.decision && filters.decision !== 'all') {
          filteredLogs = filteredLogs.filter(log => 
            log.decision === filters.decision
          )
        }
        
        // Filter by minimum risk score
        if (filters.minRiskScore !== undefined) {
          filteredLogs = filteredLogs.filter(log => 
            log.final_risk_score >= filters.minRiskScore!
          )
        }
        
        return filteredLogs
      } catch (error) {
        throw error
      }
    },
    retry: false, // Disable retry for debugging
    refetchOnWindowFocus: false,
  })
}
