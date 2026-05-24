import { NextResponse } from 'next/server'
import { getAllStatusOverrides, setStatusOverride } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/project-statuses
 * Returns all manual status overrides: { [projectId]: 'active' | 'finalized' }
 * Projects NOT in the map default to 'active'.
 */
export async function GET() {
  try {
    return NextResponse.json(await getAllStatusOverrides())
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * PATCH /api/project-statuses
 * Body: { id: number, status: 'active' | 'finalized' }
 * Sets the manual status override for a project.
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const id     = Number(body.id)
    const status = body.status as string

    if (!id || !['active', 'finalized'].includes(status)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    await setStatusOverride(id, status as 'active' | 'finalized')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
