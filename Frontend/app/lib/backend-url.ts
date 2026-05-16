/**
 * Normalize backend base URL from env.
 * NEXT_PUBLIC_API_URL must be the origin only (no trailing /api).
 * Examples:
 *   https://your-app.onrender.com
 *   http://127.0.0.1:8000
 */
export function getBackendOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    'http://127.0.0.1:8000'

  let url = raw.trim().replace(/\/+$/, '')
  if (url.endsWith('/api')) {
    url = url.slice(0, -4)
  }
  return url
}

/** Build a full backend URL for a path under /api (e.g. "me" → …/api/me). */
export function backendApiUrl(path: string): string {
  const normalized = path.startsWith('/api/')
    ? path
    : path.startsWith('/api')
      ? path
      : path.startsWith('/')
        ? `/api${path}`
        : `/api/${path}`

  return `${getBackendOrigin()}${normalized}`
}
