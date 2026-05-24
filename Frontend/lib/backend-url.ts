/**
 * Helper to construct backend API URLs
 * Uses NEXT_PUBLIC_API_URL environment variable
 * Falls back to localhost:8000 for development
 */
export function backendApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
