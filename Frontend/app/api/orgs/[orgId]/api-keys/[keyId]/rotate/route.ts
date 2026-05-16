import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string; keyId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const clerkToken = request.headers.get('x-clerk-auth-token')
    const orgHeader = /^\d+$/.test(params.orgId) ? params.orgId : null

    const response = await fetch(
      `${BACKEND_URL}/api/orgs/${params.orgId}/api-keys/${params.keyId}/rotate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
          ...(orgHeader ? { 'X-Org-Id': orgHeader } : {}),
        },
      }
    )

    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch (error) {
    console.error('Error proxying rotate org api key request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
