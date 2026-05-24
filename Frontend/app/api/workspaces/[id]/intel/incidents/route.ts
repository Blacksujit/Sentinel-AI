import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

async function proxyGet(request: NextRequest, path: string) {
  const authHeader = request.headers.get('authorization')
  const { searchParams } = request.nextUrl
  const qs = searchParams.toString()
  const url = `${backendApiUrl(path)}${qs ? `?${qs}` : ''}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    cache: 'no-store',
  })
  const text = await response.text()
  if (!response.ok) {
    try { return NextResponse.json(JSON.parse(text), { status: response.status }) }
    catch { return NextResponse.json({ error: text }, { status: response.status }) }
  }
  return NextResponse.json(text ? JSON.parse(text) : [])
}

async function proxyPost(request: NextRequest, path: string) {
  const authHeader = request.headers.get('authorization')
  const body = await request.json()
  const response = await fetch(backendApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const text = await response.text()
  if (!response.ok) {
    try { return NextResponse.json(JSON.parse(text), { status: response.status }) }
    catch { return NextResponse.json({ error: text }, { status: response.status }) }
  }
  return NextResponse.json(text ? JSON.parse(text) : {}, { status: 201 })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyGet(request, `/workspaces/${params.id}/intel/incidents`)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyPost(request, `/workspaces/${params.id}/intel/incidents`)
}
