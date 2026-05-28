import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  const body = await req.json()
  const oc = await prisma.purchaseOrder.create({ data: body })
  return NextResponse.json(oc, { status: 201 })
}
