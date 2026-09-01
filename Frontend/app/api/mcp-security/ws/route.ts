/**
 * WebSocket proxy for MCP Security real-time events.
 * This is a simplified Next.js WebSocket handler that proxies to the backend.
 * For production, consider using a dedicated WebSocket server or a service like Pusher.
 */

import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // In a real implementation, this would upgrade the connection to WebSocket
  // and proxy to the backend WebSocket endpoint.
  // For now, return a message indicating WebSocket should be used directly.
  return new Response(
    JSON.stringify({
      message: 'WebSocket endpoint. Connect directly to ws://backend:8000/api/mcp-security/ws',
      websocketUrl: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/api/mcp-security/ws`
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

// Note: Next.js App Router doesn't natively support WebSocket upgrade in route.ts
// The frontend hook connects directly to the backend WebSocket endpoint.
// See: useMCPWebSocket in hooks/mcp-security/use-mcp-security.ts