export const revalidate = 0

import { prisma } from '@/lib/prisma'
import { formatCLP } from '@/lib/fmt'
import { T } from '@/lib/theme'
import { FlujoCajaChart } from '@/components/dashboard/FlujoCajaChart'
import { PagosProximosWidget } from '@/components/dashboard/PagosProximosWidget'

export default async function DashboardPage() {
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 86400000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const [pend, pagado, proximos, mensual] = await Promise.all([
    prisma.transaction.aggregate({
      where: { status: 'PENDIENTE', movementType: 'EGRESO' },
      _sum: { gross: true },
    }),
    prisma.transaction.aggregate({
      where: { status: 'PAGADO', movementType: 'EGRESO', paymentDate: { gte: startOfMonth } },
      _sum: { gross: true },
    }),
    prisma.transaction.findMany({
      where: { status: 'PENDIENTE', paymentDate: { lte: nextWeek } },
      select: {
        id: true, description: true, gross: true, paymentDate: true,
        costCenter: { select: { code: true } },
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

  const ingresosYTD = Number(mensual.find(m => m.movementType === 'INGRESO')?._sum.net ?? 0)
  const egresosYTD = Number(mensual.find(m => m.movementType === 'EGRESO')?._sum.net ?? 0)
  const totalPendiente = Number(pend._sum.gross ?? 0)
  const totalPagadoMes = Number(pagado._sum.gross ?? 0)

  return (
    <div className="q4-page" style={{ padding: 28 }}>
      <h1 className="q4-h1" style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Dashboard
      </h1>

      <div className="q4-kpi-grid q4-kpi-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Pendiente por pagar', value: formatCLP(totalPendiente), color: T.warning },
          { label: 'Pagado este mes', value: formatCLP(totalPagadoMes), color: T.success },
          { label: 'Balance YTD', value: formatCLP(ingresosYTD - egresosYTD),
            color: ingresosYTD - egresosYTD >= 0 ? T.success : T.danger },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: T.card, borderRadius: 12,
            border: `1px solid ${T.border}`, padding: '20px 24px',
            boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
          }}>
            <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ color: kpi.color, fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="q4-dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <FlujoCajaChart />
        <PagosProximosWidget pagos={proximos.map(p => ({
          id: p.id, description: p.description,
          gross: Number(p.gross), paymentDate: p.paymentDate?.toISOString() ?? null,
          costCenter: p.costCenter?.code ?? null,
          provider: p.provider?.name ?? null,
        }))} />
      </div>
    </div>
  )
}
