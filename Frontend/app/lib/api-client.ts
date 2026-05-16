import { backendApiUrl } from '@/lib/backend-url'

function normalizeApiPath(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  if (p === '/api' || p.startsWith('/api/')) return p
  return `/api${p}`
}

/** Browser: same-origin proxy (/api/*). Server: direct Render URL. */
function resolveApiUrl(path: string): string {
  const normalized = normalizeApiPath(path)
  if (typeof window !== 'undefined') {
    return normalized
  }
  return backendApiUrl(normalized)
}

export async function apiGet(path: string, token?: string | null) {
  const url = resolveApiUrl(path)
  console.log('[API Client] GET', url)
  
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  
  console.log('[API Client] GET Response:', res.status, url)
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[API Client] GET Error:', res.status, errorText)
    throw new Error(errorText)
  }
  return res.json()
}

export async function apiPost(path: string, body: unknown, token?: string | null) {
  const url = resolveApiUrl(path)
  console.log('[API Client] POST', url, body)
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  
  console.log('[API Client] POST Response:', res.status, url)
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[API Client] POST Error:', res.status, errorText)
    throw new Error(errorText)
  }
  return res.json()
}

export async function apiDelete(path: string, token?: string | null) {
  const url = resolveApiUrl(path)
  console.log('[API Client] DELETE', url)
  
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  
  console.log('[API Client] DELETE Response:', res.status, url)
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[API Client] DELETE Error:', res.status, errorText)
    throw new Error(errorText)
  }
  return res.json()
}

export async function apiPatch(path: string, body: unknown, token?: string | null) {
  const url = resolveApiUrl(path)
  console.log('[API Client] PATCH', url, body)
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  
  console.log('[API Client] PATCH Response:', res.status, url)
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[API Client] PATCH Error:', res.status, errorText)
    throw new Error(errorText)
  }
  return res.json()
}
