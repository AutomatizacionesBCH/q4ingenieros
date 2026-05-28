export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cecoId = Number(id)
  if (!Number.isFinite(cecoId)) {
    return NextResponse.json({ error: 'CeCo inválido' }, { status: 400 })
  }

  // Flujo mensual: agrupa por mes y tipo
  const rows = await prisma.$queryRaw<{ mes: string; movementType: string; total: number }[]>`
    SELECT
      TO_CHAR("paymentDate", 'YYYY-MM') AS mes,
      "movementType"::text AS "movementType",
      SUM(net)::float AS total
    FROM "Transaction"
    WHERE "costCenterId" = ${cecoId}
      AND "status" != 'NULO'
      AND "paymentDate" IS NOT NULL
    GROUP BY mes, "movementType"
    ORDER BY mes
  `

  const map = new Map<string, { mes: string; ingresos: number; egresos: number }>()
  for (const r of rows) {
    const m = map.get(r.mes) ?? { mes: r.mes, ingresos: 0, egresos: 0 }
    if (r.movementType === 'INGRESO') m.ingresos = Number(r.total)
    else m.egresos = Number(r.total)
    map.set(r.mes, m)
  }
  const data = Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes))

  return NextResponse.json(data)
}
