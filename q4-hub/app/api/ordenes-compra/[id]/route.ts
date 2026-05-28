import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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
  const oc = await prisma.purchaseOrder.findUnique({
    where: { id: Number(id) },
    include: {
      costCenter: { select: { id: true, code: true, name: true } },
      provider: { select: { id: true, name: true, rut: true } },
      transactions: {
        include: {
          provider: { select: { name: true } },
          costCenter: { select: { code: true } },
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      },
    },
  })
  if (!oc) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json(oc)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Prisma.PurchaseOrderUncheckedUpdateInput = {}

    if (body.companyId !== undefined) data.companyId = n(body.companyId) ?? undefined
    if (body.description !== undefined) {
      const desc = s(body.description)
      if (!desc) return NextResponse.json({ error: 'Descripción no puede estar vacía' }, { status: 400 })
      data.description = desc
    }
    if (body.total !== undefined) data.total = new Prisma.Decimal(n(body.total) ?? 0)
    if (body.costCenterId !== undefined) data.costCenterId = n(body.costCenterId)
    if (body.providerId !== undefined) data.providerId = n(body.providerId)
    if (body.status !== undefined) data.status = body.status

    const oc = await prisma.purchaseOrder.update({ where: { id: Number(id) }, data })
    return NextResponse.json(oc)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ocId = Number(id)
    const txCount = await prisma.transaction.count({ where: { purchaseOrderId: ocId } })
    if (txCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: hay ${txCount} transacción(es) asociadas. Desvincúlalas primero o cierra la OC.`,
      }, { status: 400 })
    }
    await prisma.purchaseOrder.delete({ where: { id: ocId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
