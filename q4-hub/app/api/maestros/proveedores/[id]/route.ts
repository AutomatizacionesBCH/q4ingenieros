import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function s(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await prisma.provider.findUnique({ where: { id: Number(id) } })
  if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(p)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Prisma.ProviderUncheckedUpdateInput = {}
    if (body.name !== undefined) {
      const name = s(body.name)
      if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
      data.name = name
    }
    if (body.rut !== undefined) {
      const rut = s(body.rut)
      if (!rut) return NextResponse.json({ error: 'RUT requerido' }, { status: 400 })
      data.rut = rut
    }
    if (body.email !== undefined) data.email = s(body.email)
    if (body.phone !== undefined) data.phone = s(body.phone)

    const provider = await prisma.provider.update({ where: { id: Number(id) }, data })
    return NextResponse.json(provider)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const provId = Number(id)
    const [txCount, ocCount, propCount] = await Promise.all([
      prisma.transaction.count({ where: { providerId: provId } }),
      prisma.purchaseOrder.count({ where: { providerId: provId } }),
      prisma.closingProposal.count({ where: { providerId: provId } }),
    ])
    if (txCount + ocCount + propCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: ${txCount} transacciones, ${ocCount} OC, ${propCount} propuestas asociadas.`,
      }, { status: 400 })
    }
    await prisma.provider.delete({ where: { id: provId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
