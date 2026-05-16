import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(backendApiUrl('/me'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization')
          ? { Authorization: request.headers.get('authorization')! }
          : {}),
      },
      cache: 'no-store',
    })

    const body = await response.text()
    return new NextResponse(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[api/me] proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 500 })
  }
}
