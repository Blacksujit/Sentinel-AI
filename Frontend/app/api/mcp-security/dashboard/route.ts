import { NextRequest } from 'next/server'
import { proxyMCP } from '../_proxy'

export async function GET(request: NextRequest) {
  return proxyMCP('/api/mcp-security/dashboard', request, 'GET')
}
