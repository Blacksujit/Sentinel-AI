import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('authorization')
    const { searchParams } = request.nextUrl
    const qs = searchParams.toString()
    const url = `${backendApiUrl(`/workspaces/${params.id}/intel/activity`)}${qs ? `?${qs}` : ''}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: 'no-store',
    })
    const text = await response.text()
    if (!response.ok) {
      try { return NextResponse.json(JSON.parse(text), { status: response.status }) }
      catch { return NextResponse.json({ error: text }, { status: response.status }) }
    }
    return NextResponse.json(text ? JSON.parse(text) : [])
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
