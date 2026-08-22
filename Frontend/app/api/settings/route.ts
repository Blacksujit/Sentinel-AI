import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function GET(request: NextRequest) {
  return proxyBackend('/settings', request)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  return proxyBackend('/settings', request, { method: 'PUT', body })
}