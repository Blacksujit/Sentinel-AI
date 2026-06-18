import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

async function proxy(request: NextRequest, orgId: string, userId: string, method: string, body?: string) {
  const authHeader = request.headers.get('authorization')
  const clerkToken = request.headers.get('x-clerk-auth-token')
  const orgHeader = /^\d+$/.test(orgId) ? orgId : null

  const response = await fetch(backendApiUrl(`/orgs/${orgId}/members/${userId}`), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
      ...(orgHeader ? { 'X-Org-Id': orgHeader } : {}),
    },
    ...(body ? { body } : {}),
  })

  const text = await response.text()
  try {
    const json = text ? JSON.parse(text) : null
    return NextResponse.json(json, { status: response.status })
  } catch {
    return NextResponse.json({ message: text }, { status: response.status })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string; userId: string } }
) {
  try {
    const body = await request.text()
    return await proxy(request, params.orgId, params.userId, 'PATCH', body)
  } catch (error) {
    console.error('[api/orgs/members/role] proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string; userId: string } }
) {
  try {
    return await proxy(request, params.orgId, params.userId, 'DELETE')
  } catch (error) {
    console.error('[api/orgs/members/remove] proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
