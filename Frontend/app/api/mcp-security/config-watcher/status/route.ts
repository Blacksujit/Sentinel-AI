import { NextRequest } from 'next/server'
import { proxyMCP } from '../../_proxy'

export async function GET(request: NextRequest) {
  return proxyMCP('/api/mcp-security/config-watcher/status', request, 'GET')
}