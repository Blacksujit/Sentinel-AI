/**
 * Generic proxy for /api/mcp-security/* routes.
 * Re-uses the existing proxy pattern from the project.
 */
import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

async function proxyMCP(path: string, request: NextRequest, method: string, body?: unknown) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const authHeader = request.headers.get('authorization')
    const clerkToken = request.headers.get('x-clerk-auth-token')

    const url = `${backendApiUrl(path)}${query ? `?${query}` : ''}`

    const response = await fetch(url, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await response.json()
      if (!response.ok) {
        return NextResponse.json(
          { error: data?.detail || data?.error || 'Request failed' },
          { status: response.status }
        )
      }
      return NextResponse.json(data)
    }

    const text = await response.text()
    if (!response.ok) {
      return NextResponse.json({ error: text || 'Request failed' }, { status: response.status })
    }
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': contentType },
    })
  } catch (error) {
    console.error(`Proxy error for ${path}:`, error)
    return NextResponse.json(
      { error: 'Network error: Unable to connect to backend' },
      { status: 502 }
    )
  }
}

export { proxyMCP }
