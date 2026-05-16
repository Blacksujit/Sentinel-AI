import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const clerkToken = request.headers.get('x-clerk-auth-token')
    const orgHeader = /^\d+$/.test(params.orgId) ? params.orgId : null

    const response = await fetch(backendApiUrl(`/orgs/${params.orgId}/api-keys`), {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
        ...(orgHeader ? { 'X-Org-Id': orgHeader } : {}),
      },
    })

    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch (error) {
    console.error('Error proxying org api keys request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const clerkToken = request.headers.get('x-clerk-auth-token')
    const body = await request.text()
    const orgHeader = /^\d+$/.test(params.orgId) ? params.orgId : null

    const response = await fetch(backendApiUrl(`/orgs/${params.orgId}/api-keys`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(clerkToken ? { 'x-clerk-auth-token': clerkToken } : {}),
        ...(orgHeader ? { 'X-Org-Id': orgHeader } : {}),
      },
      body,
    })

    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch (error) {
    console.error('Error proxying create org api key request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
