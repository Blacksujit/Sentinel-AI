import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET() {
  try {
    const response = await fetch(backendApiUrl('/game/levels'), {
      method: 'GET',
      cache: 'no-store',
    })
    const text = await response.text()
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[api/game/levels] proxy error:', error)
    return NextResponse.json({ error: 'Failed to reach game service' }, { status: 502 })
  }
}