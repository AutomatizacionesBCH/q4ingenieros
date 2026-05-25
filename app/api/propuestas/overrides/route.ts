import { NextResponse } from 'next/server'
import { getPropuestaOverrides, setPropuestaOverride } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/propuestas/overrides
export async function GET() {
  try {
    const overrides = await getPropuestaOverrides()
    return NextResponse.json(overrides)
  } catch {
    return NextResponse.json({})
  }
}

// PATCH /api/propuestas/overrides  — body: { id, fecha?, status? }
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, fecha, status } = body as { id: string; fecha?: string; status?: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await setPropuestaOverride(id, {
      fecha:  fecha  ?? undefined,
      status: status as 'pendiente' | 'firmado' | undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
