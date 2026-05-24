import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; incidentId: string } },
) {
  try {
    const authHeader = request.headers.get('authorization')
    const url = backendApiUrl(`/workspaces/${params.id}/intel/incidents/${params.incidentId}/postmortem`)
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
    return NextResponse.json(text ? JSON.parse(text) : {})
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; incidentId: string } },
) {
  try {
    const authHeader = request.headers.get('authorization')
    const url = backendApiUrl(`/workspaces/${params.id}/intel/incidents/${params.incidentId}/postmortem`)
    const response = await fetch(url, {
      method: 'POST',
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
    return NextResponse.json(text ? JSON.parse(text) : {}, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
