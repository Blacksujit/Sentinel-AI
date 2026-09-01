import { NextRequest } from 'next/server'
import { proxyMCP } from '../../_proxy'

export async function POST(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  const body = await request.json()
  const action = request.nextUrl.searchParams.get('action') || 'acknowledge'
  return proxyMCP(`/api/mcp-security/alerts/${params.alertId}/${action}`, request, 'POST', body)
}