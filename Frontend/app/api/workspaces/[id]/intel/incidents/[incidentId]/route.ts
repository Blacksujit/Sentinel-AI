import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; incidentId: string } },
) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()
    const response = await fetch(
      backendApiUrl(`/workspaces/${params.id}/intel/incidents/${params.incidentId}`),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    )
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
