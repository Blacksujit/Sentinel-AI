import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function POST(request: NextRequest, { params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params
  const body = await request.json()
  return proxyBackend(`/workspaces/${workspaceId}/intel/escalation-policies`, request, {
    method: 'POST',
    body,
  })
}