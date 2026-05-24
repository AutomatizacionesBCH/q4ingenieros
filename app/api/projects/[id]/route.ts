import { NextResponse } from 'next/server'
import { getProjectDetailFromDB } from '@/lib/db'
import { getProjectDetail } from '@/lib/excel-parser'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Prefer SQLite (seeded data) — fall back to live Excel parse if not seeded yet
    const project = getProjectDetailFromDB(id) ?? getProjectDetail(id)
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[GET /api/projects/[id]]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
