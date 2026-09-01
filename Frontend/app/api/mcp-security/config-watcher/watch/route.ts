import { NextRequest } from 'next/server'
import { proxyMCP } from '../../_proxy'

export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyMCP('/api/mcp-security/config-watcher/watch', request, 'POST', body)
}