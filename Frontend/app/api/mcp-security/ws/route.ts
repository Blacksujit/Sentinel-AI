/**
 * WebSocket info endpoint for MCP Security.
 *
 * Next.js App Router does NOT support WebSocket upgrades in route handlers.
 * The client connects directly to the backend WebSocket with a JWT query param.
 * This endpoint returns the backend WS URL so the client knows where to connect.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getBackendOrigin } from '@/lib/backend-url'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  const backendWsUrl = getBackendOrigin().replace(/^http/, 'ws')

  return NextResponse.json({
    message: 'Connect to the backend WebSocket directly',
    websocketUrl: `${backendWsUrl}/api/mcp-security/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`,
    note: 'Client should use this URL to establish a WebSocket connection with the Clerk JWT.',
  })
}
