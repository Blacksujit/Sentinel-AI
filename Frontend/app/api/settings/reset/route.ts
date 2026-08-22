import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function POST(request: NextRequest) {
  return proxyBackend('/settings/reset', request, { method: 'POST' })
}