import { NextRequest } from 'next/server'
import { proxyMCP } from '../../_proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  return proxyMCP(`/api/mcp-security/agents/${params.agentId}`, request, 'GET')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const body = await request.json()
  return proxyMCP(`/api/mcp-security/agents/${params.agentId}`, request, 'PATCH', body)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  return proxyMCP(`/api/mcp-security/agents/${params.agentId}`, request, 'DELETE')
}
