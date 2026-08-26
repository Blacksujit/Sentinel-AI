/**
 * Helper to construct backend API URLs
 * Uses NEXT_PUBLIC_API_URL environment variable
 *
 * In production (NODE_ENV=production) the env var is REQUIRED — a missing
 * value causes every server-side proxy route to call localhost inside the
 * Vercel serverless container, which is NOT the Render backend.
 */
export function backendApiUrl(path: string): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || ''
  if (!raw) {
    const isProd = process.env.NODE_ENV === 'production'
    if (isProd) {
      throw new Error(
        'NEXT_PUBLIC_API_URL is not set. Configure it in Vercel → Settings → Environment Variables ' +
        '(the Render backend origin, e.g. https://sentinelai-backend.onrender.com).'
      )
    }
    return `http://localhost:8000${path.startsWith('/') ? path : `/${path}`}`
  }
  const baseUrl = raw.replace(/\/+$/, '').replace(/\/api$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
