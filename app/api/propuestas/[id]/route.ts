import { NextResponse } from 'next/server'
import { setPropuestaOverride } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const body = await req.json() as {
      contraparte?:  string
      proyecto?:     string
      especialista?: string
      comuna?:       string
    }

    await setPropuestaOverride(id, {
      contraparte:  body.contraparte  ?? undefined,
      proyecto:     body.proyecto     ?? undefined,
      especialista: body.especialista ?? undefined,
      comuna:       body.comuna       ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[PATCH /api/propuestas/[id]]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
