import { NextResponse } from 'next/server'
import { backendApiUrl } from '@/lib/backend-url'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(`${backendApiUrl(`/baselines/${id}`)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Timeout error: Unable to connect to backend' },
        { status: 504 }
      )
    } else {
      return NextResponse.json(
        { message: 'Network error: Unable to connect to backend' },
        { status: 502 }
      )
    }
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  try {
    const body = await _request.json()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(`${backendApiUrl(`/baselines/${id}`)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const text = await response.text()
    try {
      const json = text ? JSON.parse(text) : null
      return NextResponse.json(json, { status: response.status })
    } catch {
      return NextResponse.json({ message: text }, { status: response.status })
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Timeout error: Unable to connect to backend' },
        { status: 504 }
      )
    } else {
      return NextResponse.json(
        { message: 'Network error: Unable to connect to backend' },
        { status: 502 }
      )
    }
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(`${backendApiUrl(`/baselines/${id}`)}`, {
      method: 'DELETE',
      signal: controller.signal,
    })
    clearTimeout(timeout)
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
