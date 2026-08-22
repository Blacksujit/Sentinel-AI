import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; inviteId: string } }
) {
  const { workspaceId, inviteId } = params
  return proxyBackend(`/workspaces/${workspaceId}/invites/${inviteId}`, request, {
    method: 'DELETE',
  })
}