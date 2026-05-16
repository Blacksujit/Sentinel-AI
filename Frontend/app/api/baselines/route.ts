import { NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('include_inactive')

  try {
    const url = new URL(backendApiUrl('/baselines/'))
    if (includeInactive) url.searchParams.set('include_inactive', includeInactive)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal })
    clearTimeout(timeout)
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(backendApiUrl('/baselines/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)

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
