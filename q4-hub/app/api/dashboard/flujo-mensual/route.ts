import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const year = new Date().getFullYear()
  const txs = await prisma.transaction.findMany({
    where: {
      status: { not: 'NULO' },
      paymentDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
    },
    select: { paymentDate: true, net: true, movementType: true },
  })

  const byMonth: Record<number, { ingresos: number; egresos: number }> = {}
  for (let i = 0; i < 12; i++) byMonth[i] = { ingresos: 0, egresos: 0 }

  for (const tx of txs) {
    if (!tx.paymentDate) continue
    const m = tx.paymentDate.getMonth()
    if (tx.movementType === 'INGRESO') byMonth[m].ingresos += Number(tx.net)
    else byMonth[m].egresos += Number(tx.net)
  }

  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const result = Object.entries(byMonth).map(([m, v]) => ({ month: MESES[Number(m)], ...v }))
  return NextResponse.json(result)
}
