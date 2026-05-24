import { NextResponse } from 'next/server'
import { getProjectsFromDB } from '@/lib/db'
import { getProjectsIndex } from '@/lib/excel-parser'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Prefer SQLite (seeded data) — fall back to live Excel parse if not seeded yet
    const data = (await getProjectsFromDB()) ?? getProjectsIndex()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[GET /api/projects]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
