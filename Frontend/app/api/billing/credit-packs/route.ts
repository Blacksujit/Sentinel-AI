import { NextRequest } from 'next/server'
import { proxyBackend } from '@/api/_proxy'

export async function GET(request: NextRequest) {
  return proxyBackend('/billing/credit-packs', request)
}