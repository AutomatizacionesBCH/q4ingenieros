import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '100')

  const where = {
    ...(companyId ? { companyId: Number(companyId) } : {}),
    ...(status ? { status: status as 'PAGADO' | 'PENDIENTE' | 'NULO' } : {}),
    ...(from || to ? {
      paymentDate: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    } : {}),
  }

  const [total, txs] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: {
        costCenter: { select: { code: true, name: true } },
        account: { select: { code: true, name: true } },
        provider: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return NextResponse.json({ total, page, limit, data: txs })
}

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

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const companyId = n(body.companyId)
    const description = s(body.description)
    const movementType = body.movementType
    const net = n(body.net)
    const tax = n(body.tax) ?? 0
    const gross = n(body.gross) ?? (net != null ? net + tax : null)

    const errors: string[] = []
    if (!companyId) errors.push('Empresa es requerida')
    if (!description) errors.push('Descripción es requerida')
    if (movementType !== 'INGRESO' && movementType !== 'EGRESO') errors.push('Tipo de movimiento inválido')
    if (net == null) errors.push('Neto es requerido')
    if (gross == null) errors.push('Bruto es requerido')

    if (errors.length) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
    }

    const data: Prisma.TransactionUncheckedCreateInput = {
      companyId: companyId!,
      description: description!,
      movementType,
      net: new Prisma.Decimal(net!),
      tax: new Prisma.Decimal(tax),
      gross: new Prisma.Decimal(gross!),
      costCenterId: n(body.costCenterId) ?? undefined,
      accountId: n(body.accountId) ?? undefined,
      categoryId: n(body.categoryId) ?? undefined,
      providerId: n(body.providerId) ?? undefined,
      purchaseOrderId: n(body.purchaseOrderId) ?? undefined,
      quantity: body.quantity != null && body.quantity !== '' ? new Prisma.Decimal(n(body.quantity)!) : undefined,
      unitValue: body.unitValue != null && body.unitValue !== '' ? new Prisma.Decimal(n(body.unitValue)!) : undefined,
      paymentDate: d(body.paymentDate) ?? undefined,
      status: body.status ?? 'PENDIENTE',
      paymentMethod: body.paymentMethod || undefined,
      bank: body.bank || undefined,
      docIssueDate: d(body.docIssueDate) ?? undefined,
      docDueDate: d(body.docDueDate) ?? undefined,
      gdNumber: s(body.gdNumber) ?? undefined,
      rendicionNum: s(body.rendicionNum) ?? undefined,
      boletaNum: s(body.boletaNum) ?? undefined,
      facturaNum: s(body.facturaNum) ?? undefined,
      currency: body.currency ?? 'CLP',
      notes: s(body.notes) ?? undefined,
    }

    const tx = await prisma.transaction.create({ data })
    return NextResponse.json(tx, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
