import { NextRequest, NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const authHeader = request.headers.get('authorization')
  try {
    const response = await fetch(`${backendApiUrl(`/baselines/${id}`)}`, {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: 'no-store',
    })
    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch {
    return NextResponse.json(
      { message: 'Network error: Unable to connect to backend' },
      { status: 502 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const authHeader = request.headers.get('authorization')
  try {
    const body = await request.json()
    const response = await fetch(`${backendApiUrl(`/baselines/${id}`)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch {
    return NextResponse.json(
      { message: 'Network error: Unable to connect to backend' },
      { status: 502 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const authHeader = request.headers.get('authorization')
  try {
    const response = await fetch(`${backendApiUrl(`/baselines/${id}`)}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })
    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch {
    return NextResponse.json(
      { message: 'Network error: Unable to connect to backend' },
      { status: 502 }
    )
  }
}
