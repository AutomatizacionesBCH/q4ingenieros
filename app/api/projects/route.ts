import { NextResponse } from 'next/server'
import { getProjectsIndex } from '@/lib/excel-parser'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = getProjectsIndex()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[GET /api/projects]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
