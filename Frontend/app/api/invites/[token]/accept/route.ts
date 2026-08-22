import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params
  return proxyBackend(`/invites/${token}/accept`, request, { method: 'POST' })
}