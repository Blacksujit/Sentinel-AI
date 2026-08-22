import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyBackend('/billing/create-checkout', request, { method: 'POST', body })
}