import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string; deploymentId: string } }
) {
  const { workspaceId, deploymentId } = params
  return proxyBackend(`/workspaces/${workspaceId}/intel/deployments/${deploymentId}`, request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string; deploymentId: string } }
) {
  const { workspaceId, deploymentId } = params
  const body = await request.json()
  return proxyBackend(`/workspaces/${workspaceId}/intel/deployments/${deploymentId}`, request, {
    method: 'PATCH',
    body,
  })
}