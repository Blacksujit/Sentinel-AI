import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function GET(request: NextRequest, { params }: { params: { orgId: string } }) {
  const { orgId } = params
  return proxyBackend(`/orgs/${orgId}/risk-logs`, request)
}