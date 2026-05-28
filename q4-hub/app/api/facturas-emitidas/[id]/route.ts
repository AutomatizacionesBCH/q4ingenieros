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
  const f = await prisma.issuedInvoice.findUnique({
    where: { id: Number(id) },
    include: {
      company: { select: { id: true, name: true } },
      costCenter: { select: { id: true, code: true, name: true } },
    },
  })
  if (!f) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(f)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Prisma.IssuedInvoiceUncheckedUpdateInput = {}

    if (body.companyId !== undefined) data.companyId = n(body.companyId) ?? undefined
    if (body.costCenterId !== undefined) data.costCenterId = n(body.costCenterId)
    if (body.epNumber !== undefined) data.epNumber = s(body.epNumber)
    if (body.invoiceNumber !== undefined) data.invoiceNumber = s(body.invoiceNumber)
    if (body.amount !== undefined) data.amount = new Prisma.Decimal(n(body.amount) ?? 0)
    if (body.received !== undefined) data.received = new Prisma.Decimal(n(body.received) ?? 0)
    if (body.issueDate !== undefined) data.issueDate = d(body.issueDate)
    if (body.paymentDate !== undefined) data.paymentDate = d(body.paymentDate)
    if (body.status !== undefined) data.status = body.status
    if (body.factoring !== undefined) data.factoring = Boolean(body.factoring)
    if (body.factoringInterest !== undefined) {
      data.factoringInterest = body.factoringInterest === '' || body.factoringInterest == null
        ? null : new Prisma.Decimal(n(body.factoringInterest)!)
    }
    if (body.factoringDueDate !== undefined) data.factoringDueDate = d(body.factoringDueDate)
    if (body.entity !== undefined) data.entity = s(body.entity)

    const f = await prisma.issuedInvoice.update({ where: { id: Number(id) }, data })
    return NextResponse.json(f)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.issuedInvoice.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
