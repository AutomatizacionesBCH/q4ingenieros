export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP } from '@/lib/fmt'
import { FlujoCajaChart } from '@/components/dashboard/FlujoCajaChart'
import { PagosProximosWidget } from '@/components/dashboard/PagosProximosWidget'

export default async function DashboardPage() {
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 86400000)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const [totalPendiente, totalPagadoMes, proximosPagos, mensual] = await Promise.all([
    prisma.transaction.aggregate({
      where: { status: 'PENDIENTE', movementType: 'EGRESO' },
      _sum: { gross: true },
    }),
    prisma.transaction.aggregate({
      where: {
        status: 'PAGADO', movementType: 'EGRESO',
        paymentDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _sum: { gross: true },
    }),
    prisma.transaction.findMany({
      where: { status: 'PENDIENTE', paymentDate: { lte: nextWeek } },
      include: {
        costCenter: { select: { code: true, name: true } },
        provider: { select: { name: true } },
      },
      orderBy: { paymentDate: 'asc' },
      take: 10,
    }),
    prisma.transaction.groupBy({
      by: ['movementType'],
      where: { paymentDate: { gte: startOfYear }, status: { not: 'NULO' } },
      _sum: { net: true },
    }),
  ])

  const ingresosYTD = mensual.find(m => m.movementType === 'INGRESO')?._sum.net ?? 0
  const egresosYTD = mensual.find(m => m.movementType === 'EGRESO')?._sum.net ?? 0

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Pendiente por pagar', value: formatCLP(Number(totalPendiente._sum.gross)), color: '#D4A017' },
          { label: 'Pagado este mes', value: formatCLP(Number(totalPagadoMes._sum.gross)), color: '#3D8B5E' },
          { label: 'Balance YTD', value: formatCLP(Number(ingresosYTD) - Number(egresosYTD)), color: '#F0EDE8' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: '#162138', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px',
          }}>
            <div style={{ color: '#5A7090', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ color: kpi.color, fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <FlujoCajaChart />
        <PagosProximosWidget pagos={proximosPagos.map(p => ({
          id: p.id, description: p.description,
          gross: Number(p.gross), paymentDate: p.paymentDate?.toISOString() ?? null,
          costCenter: p.costCenter?.code ?? null,
          provider: p.provider?.name ?? null,
        }))} />
      </div>
    </div>
  )
}
