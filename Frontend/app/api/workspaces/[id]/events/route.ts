import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { searchParams } = request.nextUrl
    const limit = searchParams.get('limit') || '20'
    const offset = searchParams.get('offset') || '0'
    const backendPath = `/workspaces/${params.id}/events?limit=${limit}&offset=${offset}`

    const response = await fetch(backendApiUrl(backendPath), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: 'no-store',
    })

    const text = await response.text()
    if (!response.ok) {
      try {
        return NextResponse.json(JSON.parse(text), { status: response.status })
      } catch {
        return NextResponse.json(
          { error: text || 'Failed to fetch workspace events' },
          { status: response.status }
        )
      }
    }

    try {
      return NextResponse.json(text ? JSON.parse(text) : [])
    } catch {
      return NextResponse.json([], { status: 200 })
    }
  } catch (error) {
    console.error('[api/workspaces/events] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
