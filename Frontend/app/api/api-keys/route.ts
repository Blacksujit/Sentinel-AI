import { NextResponse } from 'next/server'

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://127.0.0.1:8000'

function normalizeBackendBase(base: string) {
  const trimmed = base.endsWith('/') ? base.slice(0, -1) : base
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

function requireAdminToken() {
  const token = process.env.SENTINELAI_ADMIN_TOKEN
  if (!token) {
    return { error: 'SENTINELAI_ADMIN_TOKEN is not configured', status: 500 as const }
  }
  return { token }
}

export async function GET() {
  const admin = requireAdminToken()
  if ('error' in admin) {
    return NextResponse.json({ message: admin.error }, { status: admin.status })
  }

  const base = normalizeBackendBase(BACKEND_BASE_URL)
  const response = await fetch(`${base}/api/api-keys`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${admin.token}`,
    },
  })

  const text = await response.text()
  try {
    const json = text ? JSON.parse(text) : null
    return NextResponse.json(json, { status: response.status })
  } catch {
    return NextResponse.json({ message: text }, { status: response.status })
  }
}

export async function POST(request: Request) {
  const admin = requireAdminToken()
  if ('error' in admin) {
    return NextResponse.json({ message: admin.error }, { status: admin.status })
  }

  const body = await request.json().catch(() => null)
  const base = normalizeBackendBase(BACKEND_BASE_URL)

  const response = await fetch(`${base}/api/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify(body || {}),
  })

  const text = await response.text()
  try {
    const json = text ? JSON.parse(text) : null
    return NextResponse.json(json, { status: response.status })
  } catch {
    return NextResponse.json({ message: text }, { status: response.status })
  }
}
