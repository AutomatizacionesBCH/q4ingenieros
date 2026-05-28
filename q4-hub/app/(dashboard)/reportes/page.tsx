export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP } from '@/lib/fmt'

export default async function ReportesPage() {
  const year = new Date().getFullYear()

  const porEmpresa = await prisma.transaction.groupBy({
    by: ['companyId', 'movementType'],
    where: {
      status: { not: 'NULO' },
      paymentDate: { gte: new Date(year, 0, 1) },
    },
    _sum: { net: true, gross: true },
  })

  const companies = await prisma.company.findMany({ select: { id: true, name: true } })

  const resumen = companies.map(c => {
    const ingresos = porEmpresa.find(r => r.companyId === c.id && r.movementType === 'INGRESO')?._sum.net ?? 0
    const egresos = porEmpresa.find(r => r.companyId === c.id && r.movementType === 'EGRESO')?._sum.net ?? 0
    return { empresa: c.name, ingresos: Number(ingresos), egresos: Number(egresos), resultado: Number(ingresos) - Number(egresos) }
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Reportes</h1>
          <div style={{ color: '#8A9BB8', fontSize: 13 }}>Estado de Resultados YTD {year}</div>
        </div>
        <a href={`/api/reportes/export?year=${year}`} style={{
          background: '#3D8B5E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>↓ Exportar a Excel</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {resumen.map(r => (
          <div key={r.empresa} style={{
            background: '#162138', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: 24,
          }}>
            <div style={{ color: '#E5501E', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>{r.empresa}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Ingresos', value: r.ingresos, color: '#3D8B5E' },
                { label: 'Egresos', value: r.egresos, color: '#C0392B' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8A9BB8', fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: row.color, fontSize: 14, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {formatCLP(row.value)}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12,
                display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#F0EDE8', fontSize: 13, fontWeight: 700 }}>Resultado</span>
                <span style={{
                  fontSize: 16, fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                  color: r.resultado >= 0 ? '#3D8B5E' : '#C0392B',
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
