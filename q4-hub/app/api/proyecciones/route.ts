import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const weekOffset = parseInt(searchParams.get('week') ?? '0')

  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const txs = await prisma.transaction.findMany({
    where: {
      status: 'PENDIENTE',
      movementType: 'EGRESO',
      paymentDate: { gte: monday, lte: sunday },
    },
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true, rut: true } },
      company: { select: { name: true } },
      purchaseOrder: { select: { id: true } },
    },
    orderBy: { gross: 'desc' },
  })

  const total = txs.reduce((sum, t) => sum + Number(t.gross), 0)
  return NextResponse.json({ week: { from: monday, to: sunday }, total, count: txs.length, data: txs })
}
