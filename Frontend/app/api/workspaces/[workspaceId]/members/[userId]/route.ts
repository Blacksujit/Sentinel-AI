import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  const { workspaceId, userId } = params
  const body = await request.json()
  return proxyBackend(`/workspaces/${workspaceId}/members/${userId}`, request, {
    method: 'PATCH',
    body,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  const { workspaceId, userId } = params
  return proxyBackend(`/workspaces/${workspaceId}/members/${userId}`, request, { method: 'DELETE' })
}