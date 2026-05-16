// Direct backend API client - bypasses Next.js proxy issues
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

// API base is just the backend URL - paths include /api prefix
const API_BASE = BACKEND_URL.replace(/\/api\/?$/, '')

console.log('[API Client] Backend URL:', BACKEND_URL)
console.log('[API Client] API Base:', API_BASE)

function normalizeApiPath(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  if (p === '/api' || p.startsWith('/api/')) return p
  return `/api${p}`
}

export async function apiGet(path: string, token?: string | null) {
  const url = `${API_BASE}${normalizeApiPath(path)}`
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
  const url = `${API_BASE}${normalizeApiPath(path)}`
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
  const url = `${API_BASE}${normalizeApiPath(path)}`
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
  const url = `${API_BASE}${normalizeApiPath(path)}`
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
