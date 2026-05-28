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

export async function GET() {
  const facturas = await prisma.issuedInvoice.findMany({
    include: {
      company: { select: { name: true } },
      costCenter: { select: { code: true, name: true } },
    },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(facturas)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const companyId = n(body.companyId)
    const amount = n(body.amount)

    const errors: string[] = []
    if (!companyId) errors.push('Empresa requerida')
    if (amount == null) errors.push('Monto requerido')

    if (errors.length) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
    }

    const data: Prisma.IssuedInvoiceUncheckedCreateInput = {
      companyId: companyId!,
      amount: new Prisma.Decimal(amount!),
      received: new Prisma.Decimal(n(body.received) ?? 0),
      costCenterId: n(body.costCenterId) ?? undefined,
      epNumber: s(body.epNumber) ?? undefined,
      invoiceNumber: s(body.invoiceNumber) ?? undefined,
      issueDate: d(body.issueDate) ?? undefined,
      paymentDate: d(body.paymentDate) ?? undefined,
      status: body.status ?? 'PENDIENTE',
      factoring: Boolean(body.factoring),
      factoringInterest: body.factoringInterest != null && body.factoringInterest !== ''
        ? new Prisma.Decimal(n(body.factoringInterest)!) : undefined,
      factoringDueDate: d(body.factoringDueDate) ?? undefined,
      entity: s(body.entity) ?? undefined,
    }

    const f = await prisma.issuedInvoice.create({ data })
    return NextResponse.json(f, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
