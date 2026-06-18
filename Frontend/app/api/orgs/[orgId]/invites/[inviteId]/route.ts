import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string; inviteId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const clerkToken = request.headers.get('x-clerk-auth-token')
    const orgHeader = /^\d+$/.test(params.orgId) ? params.orgId : null

    const response = await fetch(backendApiUrl(`/orgs/${params.orgId}/invites/${params.inviteId}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
        ...(orgHeader ? { 'X-Org-Id': orgHeader } : {}),
      },
    })

    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch (error) {
    console.error('[api/orgs/invites/cancel] proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
