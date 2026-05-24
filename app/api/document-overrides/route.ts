import { NextRequest, NextResponse } from 'next/server'
import { getAllDocOverrides, setDocOverride } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/document-overrides → { [docId]: { status, fecha } } */
export async function GET() {
  try {
    return NextResponse.json(getAllDocOverrides())
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/** PATCH /api/document-overrides  body: { id, status?, fecha? } */
export async function PATCH(req: NextRequest) {
  try {
    const { id, status, fecha } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    if (status && !['pagado', 'pendiente'].includes(status))
      return NextResponse.json({ error: 'status inválido' }, { status: 400 })
    setDocOverride(String(id), { status, fecha })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
