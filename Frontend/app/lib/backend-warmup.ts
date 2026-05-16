/**
 * Backend warmup utilities for Render cold starts.
 * Throttled to avoid request storms from every page load.
 */

const MAX_RETRIES = 2
const BASE_DELAY = 1500
const MAX_DELAY = 6000
const WARMUP_SESSION_KEY = 'sentinel_backend_warmed_v1'

function isWarmupDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_BACKEND_WARMUP === 'true'
}

function wasWarmedThisSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(WARMUP_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markWarmedThisSession(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(WARMUP_SESSION_KEY, '1')
  } catch {
    /* ignore */
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: unknown) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    baseDelay = BASE_DELAY,
    maxDelay = MAX_DELAY,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (error && typeof error === 'object' && 'response' in error) {
        const status = (error as { response?: { status?: number } }).response?.status
        if (status !== undefined && status >= 400 && status < 500) {
          throw error
        }
      }

      if (attempt === maxRetries) {
        throw lastError
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      onRetry?.(attempt + 1, error)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export async function checkBackendHealth(): Promise<boolean> {
  if (isWarmupDisabled()) return true

  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Warm up backend once per browser session (not every navigation).
 */
export async function warmupBackend(
  onStatus?: (status: string) => void
): Promise<boolean> {
  if (isWarmupDisabled()) return true
  if (wasWarmedThisSession()) return true

  const ok = await withRetry(
    async () => {
      const isHealthy = await checkBackendHealth()
      if (!isHealthy) {
        throw new Error('Backend not responding')
      }
      return true
    },
    {
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 8000,
      onRetry: (attempt) => {
        onStatus?.(`Warming up backend… (attempt ${attempt}/2)`)
      },
    }
  ).catch(() => false)

  if (ok) {
    markWarmedThisSession()
  }

  return ok
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: {
    maxRetries?: number
    onRetry?: (attempt: number, error: unknown) => void
  } = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, {
        ...options,
        cache: 'no-store',
      })

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        ;(error as Error & { response?: Response }).response = response
        throw error
      }

      return response
    },
    retryOptions
  )
}
