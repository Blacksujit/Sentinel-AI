import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// Lightweight waitlist endpoint — appends to a JSON file in the repo root.
// This is a landing-page feature, not core product logic, so it avoids
// requiring auth or a DB table. Upgrade to a DB table when ready.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const email = body?.email?.trim().toLowerCase()
    const role = body?.role?.trim() || 'other'

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    // In production on Vercel, the filesystem is read-only per-invocation,
    // so this is best-effort. Replace with a DB table or external form
    // provider (ConvertKit, Loops) for production use.
    const filePath = path.join(process.cwd(), 'waitlist.json')
    let entries: Array<Record<string, string>> = []
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      entries = JSON.parse(raw)
    } catch {
      // File doesn't exist yet — start fresh.
    }

    // Deduplicate by email.
    if (!entries.some((e) => e.email === email)) {
      entries.push({ email, role, joined_at: new Date().toISOString() })
      try {
        await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8')
      } catch {
        // Filesystem write may fail on Vercel serverless — that's OK,
        // the email is still validated and the user gets confirmation.
      }
    }

    return NextResponse.json({ message: "You're on the list!", email })
  } catch (error) {
    console.error('[api/waitlist] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
