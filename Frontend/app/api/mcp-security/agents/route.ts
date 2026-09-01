import { NextRequest } from 'next/server'
import { proxyMCP } from '../_proxy'

export async function GET(request: NextRequest) {
  return proxyMCP('/api/mcp-security/agents', request, 'GET')
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyMCP('/api/mcp-security/agents', request, 'POST', body)
}
