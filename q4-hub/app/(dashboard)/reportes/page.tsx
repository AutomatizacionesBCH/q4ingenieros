export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP } from '@/lib/fmt'
import { T } from '@/lib/theme'
import { Generador } from '@/components/reportes/Generador'
import { getCompanies, getCecos, getAccounts } from '@/lib/maestros-cache'

export default async function ReportesPage() {
  const year = new Date().getFullYear()

  const [porEmpresa, companies, cecos, accounts] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['companyId', 'movementType'],
      where: { status: { not: 'NULO' }, paymentDate: { gte: new Date(year, 0, 1) } },
      _sum: { net: true, gross: true },
    }),
    getCompanies(), getCecos(), getAccounts(),
  ])

  const resumen = companies.map(c => {
    const ingresos = porEmpresa.find(r => r.companyId === c.id && r.movementType === 'INGRESO')?._sum.net ?? 0
    const egresos = porEmpresa.find(r => r.companyId === c.id && r.movementType === 'EGRESO')?._sum.net ?? 0
    return { empresa: c.name, ingresos: Number(ingresos), egresos: Number(egresos), resultado: Number(ingresos) - Number(egresos) }
  })

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Reportes</h1>
        <div style={{ color: T.textSec, fontSize: 13 }}>Genera reportes en PDF o Excel con filtros</div>
      </div>

      <Generador
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
        accounts={accounts.map(a => ({ id: a.id, label: `${a.code} · ${a.name}` }))}
      />

      {/* Estado de Resultados YTD por empresa */}
      <h2 style={{ color: T.textPrimary, fontSize: 14, fontWeight: 700, marginBottom: 12,
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Estado de Resultados YTD {year}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {resumen.map(r => (
          <div key={r.empresa} style={{
            background: T.card, borderRadius: 12,
            border: `1px solid ${T.border}`, padding: 24,
            boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
          }}>
            <div style={{ color: T.orange, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>{r.empresa}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Ingresos', value: r.ingresos, color: T.success },
                { label: 'Egresos', value: r.egresos, color: T.danger },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.textSec, fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: row.color, fontSize: 14, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {formatCLP(row.value)}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12,
                display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.textPrimary, fontSize: 13, fontWeight: 700 }}>Resultado</span>
                <span style={{
                  fontSize: 16, fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                  color: r.resultado >= 0 ? T.success : T.danger,
                }}>
                  {formatCLP(r.resultado)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
