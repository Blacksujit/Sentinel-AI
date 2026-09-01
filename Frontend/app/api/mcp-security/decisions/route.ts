import { NextRequest } from 'next/server'
import { proxyMCP } from '../_proxy'

export async function GET(request: NextRequest) {
  return proxyMCP('/api/mcp-security/decisions', request, 'GET')
}