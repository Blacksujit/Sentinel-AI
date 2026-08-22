import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function proxyBackend(
  path: string,
  request: NextRequest,
  options: { method?: string; body?: unknown } = {}
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()

    const authHeader = request.headers.get('authorization')
    const clerkToken = request.headers.get('x-clerk-auth-token')

    const url = `${backendApiUrl(path)}${query ? `?${query}` : ''}`

    const response = await fetch(url, {
      method: options.method || request.method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}