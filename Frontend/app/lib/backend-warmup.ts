/**
 * Backend warmup and retry utilities for Render cold starts
 */

const MAX_RETRIES = 4
const BASE_DELAY = 1000 // 1 second
const MAX_DELAY = 8000 // 8 seconds

/**
 * Exponential backoff retry for API calls during cold starts
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: any) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    baseDelay = BASE_DELAY,
    maxDelay = MAX_DELAY,
    onRetry
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on 4xx errors (client errors)
      if (error && typeof error === 'object' && 'response' in error) {
        const status = (error as any).response?.status
        if (status >= 400 && status < 500) {
          throw error
        }
      }

      if (attempt === maxRetries) {
        throw lastError
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      
      if (onRetry) {
        onRetry(attempt + 1, error)
      }

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Check if backend is warm and ready
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) // 10s timeout
    })
    
    return response.ok
  } catch {
    return false
  }
}

/**
 * Warm up the backend with retries
 */
export async function warmupBackend(
  onStatus?: (status: string) => void
): Promise<boolean> {
  return withRetry(
    async () => {
      const isHealthy = await checkBackendHealth()
      if (!isHealthy) {
        throw new Error('Backend not responding')
      }
      return true
    },
    {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      onRetry: (attempt, error) => {
        onStatus?.(`Warming up backend... (attempt ${attempt}/3)`)
      }
    }
  ).catch(() => false)
}

/**
 * Enhanced fetch with retry for cold starts
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: {
    maxRetries?: number
    onRetry?: (attempt: number, error: any) => void
  } = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, {
        ...options,
        cache: 'no-store'
      })
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        ;(error as any).response = response
        throw error
      }
      
      return response
    },
    retryOptions
  )
}
