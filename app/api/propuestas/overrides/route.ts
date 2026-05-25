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

// PATCH /api/propuestas/overrides — body: { id, contraparte?, proyecto?, especialista?, comuna? }
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, contraparte, proyecto, especialista, comuna } = body as {
      id:           string
      contraparte?:  string
      proyecto?:     string
      especialista?: string
      comuna?:       string
    }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await setPropuestaOverride(id, { contraparte, proyecto, especialista, comuna })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
