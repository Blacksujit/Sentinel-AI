import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'

    const authHeader = request.headers.get('authorization')
    const clerkToken = request.headers.get('x-clerk-auth-token')
    
    const response = await fetch(`${backendApiUrl('/logs')}?limit=${limit}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
      },
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying logs request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
