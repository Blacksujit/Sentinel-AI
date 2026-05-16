import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const authHeader = request.headers.get('authorization')
    const clerkToken = request.headers.get('x-clerk-auth-token')

    const response = await fetch(backendApiUrl('/analyze'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
      },
      body,
      cache: 'no-store',
    })

    const text = await response.text()
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[api/analyze] proxy error:', error)
    return NextResponse.json({ error: 'Failed to reach analysis service' }, { status: 502 })
  }
}
