import { NextResponse } from 'next/server'
import { getEdits, saveEdits } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  if (isNaN(projectId)) return NextResponse.json({}, { status: 400 })
  return NextResponse.json(await getEdits(projectId))
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  if (isNaN(projectId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const body = await req.json()
  await saveEdits(projectId, body)
  return NextResponse.json({ ok: true })
}
