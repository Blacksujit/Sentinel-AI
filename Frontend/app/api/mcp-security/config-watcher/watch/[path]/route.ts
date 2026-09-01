import { NextRequest } from 'next/server'
import { proxyMCP } from '../../../_proxy'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string } }
) {
  return proxyMCP(`/api/mcp-security/config-watcher/watch/${decodeURIComponent(params.path)}`, request, 'DELETE')
}