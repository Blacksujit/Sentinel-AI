import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string; incidentId: string } }
) {
  const { workspaceId, incidentId } = params
  return proxyBackend(`/workspaces/${workspaceId}/intel/incidents/${incidentId}`, request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string; incidentId: string } }
) {
  const { workspaceId, incidentId } = params
  const body = await request.json()
  return proxyBackend(`/workspaces/${workspaceId}/intel/incidents/${incidentId}`, request, {
    method: 'PATCH',
    body,
  })
}