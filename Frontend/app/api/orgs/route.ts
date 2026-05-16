import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    
    const response = await fetch(backendApiUrl('/orgs'), {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    })
    
    const text = await response.text()
    if (!response.ok) {
      try {
        return NextResponse.json(JSON.parse(text), { status: response.status })
      } catch {
        return NextResponse.json({ error: text || 'Failed to fetch organizations' }, { status: response.status })
      }
    }

    try {
      return NextResponse.json(text ? JSON.parse(text) : null)
    } catch {
      return new NextResponse(text, { status: 200 })
    }
  } catch (error) {
    console.error('Error proxying orgs request:', error)
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
    
    const response = await fetch(backendApiUrl('/orgs'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(body),
    })
    
    const text = await response.text()
    if (!response.ok) {
      try {
        return NextResponse.json(JSON.parse(text), { status: response.status })
      } catch {
        return NextResponse.json({ error: text || 'Failed to create organization' }, { status: response.status })
      }
    }

    try {
      return NextResponse.json(text ? JSON.parse(text) : null)
    } catch {
      return new NextResponse(text, { status: 200 })
    }
  } catch (error) {
    console.error('Error creating org:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
