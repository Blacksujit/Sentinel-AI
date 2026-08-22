import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function GET(request: NextRequest, { params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params
  return proxyBackend(`/workspaces/${workspaceId}/intel/summary`, request)
}