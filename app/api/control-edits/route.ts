import { NextResponse } from 'next/server'
import { getControlEdits, saveControlEdits } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getControlEdits()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ edits: {}, extraMonths: [] }, { status: 200 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { edits, extraMonths } = await req.json()
    await saveControlEdits(edits, extraMonths)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
