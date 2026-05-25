import { NextResponse } from 'next/server'
import { getAllDocOverrides, setDocOverride } from '@/lib/db'
import type { DocOverride } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/document-overrides — returns all { docId: { fecha, status, descripcion, referencia } }
export async function GET() {
  try {
    const overrides = await getAllDocOverrides()
    return NextResponse.json(overrides)
  } catch {
    return NextResponse.json({})
  }
}

// PATCH /api/document-overrides — body: { id, fecha?, status?, descripcion?, referencia? }
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, fecha, status, descripcion, referencia } = body as {
      id:           string
      fecha?:       string
      status?:      string
      descripcion?: string
      referencia?:  string
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const override: DocOverride = {}
    if (fecha       !== undefined) override.fecha       = fecha       || undefined
    if (status      !== undefined) override.status      = status      as DocOverride['status']
    if (descripcion !== undefined) override.descripcion = descripcion || undefined
    if (referencia  !== undefined) override.referencia  = referencia  || undefined

    await setDocOverride(id, override)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
