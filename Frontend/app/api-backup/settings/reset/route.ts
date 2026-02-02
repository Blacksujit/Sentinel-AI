import { NextResponse } from 'next/server'

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://127.0.0.1:8000'

export async function POST(request: Request) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/settings/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend reset error:', response.status, errorText)
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Settings reset proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    )
  }
}
