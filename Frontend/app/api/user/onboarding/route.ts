import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()

    const response = await fetch(backendApiUrl('/user/onboarding'), {
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
          { error: text || 'Failed to complete onboarding' },
          { status: response.status }
        )
      }
    }

    try {
      return NextResponse.json(text ? JSON.parse(text) : { ok: true })
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 })
    }
  } catch (error) {
    console.error('[api/user/onboarding] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
