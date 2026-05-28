import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function n(v: unknown): number | null {
  if (v === '' || v == null) return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

function s(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ceco = await prisma.costCenter.findUnique({
    where: { id: Number(id) },
    include: { company: { select: { id: true, name: true } } },
  })
  if (!ceco) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(ceco)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Prisma.CostCenterUncheckedUpdateInput = {}
    if (body.code !== undefined) {
      const code = s(body.code)
      if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
      data.code = code
    }
    if (body.name !== undefined) {
      const name = s(body.name)
      if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
      data.name = name
    }
    if (body.companyId !== undefined) data.companyId = n(body.companyId) ?? undefined
    if (body.projectNumber !== undefined) data.projectNumber = s(body.projectNumber)
    if (body.location !== undefined) data.location = s(body.location)

    const ceco = await prisma.costCenter.update({ where: { id: Number(id) }, data })
    return NextResponse.json(ceco)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cecoId = Number(id)
    const txCount = await prisma.transaction.count({ where: { costCenterId: cecoId } })
    if (txCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: hay ${txCount} transacción(es) asociadas a este CeCo.`,
      }, { status: 400 })
    }
    await prisma.costCenter.delete({ where: { id: cecoId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
