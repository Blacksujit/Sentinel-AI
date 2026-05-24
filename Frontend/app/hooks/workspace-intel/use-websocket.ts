/**
 * WebSocket hook stub — connects directly to backend for real-time events.
 * Disabled until backend WebSocket is reachable from frontend.
 */

'use client'

export function useWorkspaceWebSocket(_workspaceId: string) {
  return { send: (_data: unknown) => {} }
}
