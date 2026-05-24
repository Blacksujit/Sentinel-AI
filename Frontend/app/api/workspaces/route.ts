import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const { searchParams } = request.nextUrl
    const orgId = searchParams.get('org_id')
    
    // Build query string
    let query = ''
    if (orgId) {
      query = `?org_id=${encodeURIComponent(orgId)}`
    }

    const response = await fetch(`${backendApiUrl('/workspaces')}${query}`, {
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
          { error: text || 'Failed to fetch workspaces' },
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
    console.error('[api/workspaces] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()

    const response = await fetch(backendApiUrl('/workspaces'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    if (!response.ok) {
      try {
        return NextResponse.json(JSON.parse(text), { status: response.status })
      } catch {
        return NextResponse.json(
          { error: text || 'Failed to create workspace' },
          { status: response.status }
        )
      }
    }

    try {
      return NextResponse.json(text ? JSON.parse(text) : null)
    } catch {
      return new NextResponse(text, { status: 201 })
    }
  } catch (error) {
    console.error('[api/workspaces] POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
