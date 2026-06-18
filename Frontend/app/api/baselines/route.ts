import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('include_inactive')
  const authHeader = request.headers.get('authorization')

  try {
    const url = new URL(backendApiUrl('/baselines/'))
    if (includeInactive) url.searchParams.set('include_inactive', includeInactive)

    const response = await fetch(url.toString(), {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: 'no-store',
    })
    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch {
    return NextResponse.json(
      { message: 'Network error: Unable to connect to backend' },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()
    const response = await fetch(backendApiUrl('/baselines/'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch {
    return NextResponse.json(
      { message: 'Network error: Unable to connect to backend' },
      { status: 502 }
    )
  }
}
