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

function d(v: unknown): Date | null {
  if (!v || typeof v !== 'string') return null
  const dt = new Date(v)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tx = await prisma.transaction.findUnique({
    where: { id: Number(id) },
    include: {
      costCenter: { select: { id: true, code: true, name: true } },
      account: { select: { id: true, code: true, name: true } },
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
    },
  })
  if (!tx) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(tx)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Prisma.TransactionUncheckedUpdateInput = {}

    if (body.companyId !== undefined) data.companyId = n(body.companyId) ?? undefined
    if (body.description !== undefined) {
      const desc = s(body.description)
      if (!desc) return NextResponse.json({ error: 'Descripción no puede estar vacía' }, { status: 400 })
      data.description = desc
    }
    if (body.movementType !== undefined) data.movementType = body.movementType
    if (body.net !== undefined) data.net = new Prisma.Decimal(n(body.net) ?? 0)
    if (body.tax !== undefined) data.tax = new Prisma.Decimal(n(body.tax) ?? 0)
    if (body.gross !== undefined) data.gross = new Prisma.Decimal(n(body.gross) ?? 0)
    if (body.costCenterId !== undefined) data.costCenterId = n(body.costCenterId)
    if (body.accountId !== undefined) data.accountId = n(body.accountId)
    if (body.categoryId !== undefined) data.categoryId = n(body.categoryId)
    if (body.providerId !== undefined) data.providerId = n(body.providerId)
    if (body.purchaseOrderId !== undefined) data.purchaseOrderId = n(body.purchaseOrderId)
    if (body.quantity !== undefined) data.quantity = body.quantity === '' || body.quantity == null ? null : new Prisma.Decimal(n(body.quantity)!)
    if (body.unitValue !== undefined) data.unitValue = body.unitValue === '' || body.unitValue == null ? null : new Prisma.Decimal(n(body.unitValue)!)
    if (body.paymentDate !== undefined) data.paymentDate = d(body.paymentDate)
    if (body.status !== undefined) data.status = body.status
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod || null
    if (body.bank !== undefined) data.bank = body.bank || null
    if (body.docIssueDate !== undefined) data.docIssueDate = d(body.docIssueDate)
    if (body.docDueDate !== undefined) data.docDueDate = d(body.docDueDate)
    if (body.gdNumber !== undefined) data.gdNumber = s(body.gdNumber)
    if (body.rendicionNum !== undefined) data.rendicionNum = s(body.rendicionNum)
    if (body.boletaNum !== undefined) data.boletaNum = s(body.boletaNum)
    if (body.facturaNum !== undefined) data.facturaNum = s(body.facturaNum)
    if (body.currency !== undefined) data.currency = body.currency
    if (body.notes !== undefined) data.notes = s(body.notes)

    const tx = await prisma.transaction.update({ where: { id: Number(id) }, data })
    return NextResponse.json(tx)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.transaction.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
