import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function GET(request: NextRequest) {
  return proxyBackend('/workspaces', request)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyBackend('/workspaces', request, { method: 'POST', body })
}