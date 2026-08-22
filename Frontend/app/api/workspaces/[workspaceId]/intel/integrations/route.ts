import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function GET(request: NextRequest, { params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params
  return proxyBackend(`/workspaces/${workspaceId}/intel/integrations`, request)
}

export async function POST(request: NextRequest, { params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params
  const body = await request.json()
  return proxyBackend(`/workspaces/${workspaceId}/intel/integrations`, request, {
    method: 'POST',
    body,
  })
}