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

export async function GET() {
  const ocs = await prisma.purchaseOrder.findMany({
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true, rut: true } },
      transactions: { select: { gross: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const enriched = ocs.map(oc => {
    const gastado = oc.transactions
      .filter(t => t.status === 'PAGADO')
      .reduce((s, t) => s + Number(t.gross), 0)
    return { ...oc, gastado, saldo: Number(oc.total) - gastado }
  })

  return NextResponse.json(enriched)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const companyId = n(body.companyId)
    const description = s(body.description)
    const total = n(body.total)

    const errors: string[] = []
    if (!companyId) errors.push('Empresa requerida')
    if (!description) errors.push('Descripción requerida')
    if (total == null) errors.push('Total requerido')

    if (errors.length) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
    }

    const data: Prisma.PurchaseOrderUncheckedCreateInput = {
      companyId: companyId!,
      description: description!,
      total: new Prisma.Decimal(total!),
      costCenterId: n(body.costCenterId) ?? undefined,
      providerId: n(body.providerId) ?? undefined,
      status: body.status ?? 'ACTIVA',
    }

    const oc = await prisma.purchaseOrder.create({ data })
    return NextResponse.json(oc, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
