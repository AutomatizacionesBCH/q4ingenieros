import { NextResponse } from 'next/server'
import { getReporteAvanceEdits, saveReporteAvanceEdits } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getReporteAvanceEdits()
    return NextResponse.json(data)
  } catch (e) {
    console.error('[api/reporte-avance-edits GET]', e)
    return NextResponse.json({ edits: {}, extraMonths: [] }, { status: 200 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { edits, extraMonths } = await req.json()
    await saveReporteAvanceEdits(edits, extraMonths)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
