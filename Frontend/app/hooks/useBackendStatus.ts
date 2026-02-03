'use client'

import { useState, useEffect, useCallback } from 'react'
import { checkBackendHealth, warmupBackend } from '@/lib/backend-warmup'

export function useBackendStatus() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const healthy = await checkBackendHealth()
      setIsHealthy(healthy)
      return healthy
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check backend health')
      setIsHealthy(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const warmup = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await warmupBackend()
      setIsHealthy(success)
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to warm up backend')
      setIsHealthy(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  return {
    isHealthy,
    isLoading,
    error,
    checkHealth,
    warmup
  }
}
