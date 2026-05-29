export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { CeCoSelector } from '@/components/flujo-ceco/CeCoSelector'
import { FlujoCecoChart } from '@/components/flujo-ceco/FlujoCecoChart'
import { StatusBadge } from '@/components/transacciones/StatusBadge'
import { Pagination } from '@/components/Pagination'

export default async function FlujoCecoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const cecoId = sp.ceco ? Number(sp.ceco) : null
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const limit = 50

  const cecos = await prisma.costCenter.findMany({
    select: { id: true, code: true, name: true, company: { select: { name: true } } },
    orderBy: { code: 'asc' },
  })

  const cecoOptions = cecos.map(c => ({
    id: c.id, label: `${c.code} · ${c.name}`, sub: c.company.name.split(' ')[0],
  }))

  if (!cecoId) {
    return (
      <div className="q4-page" style={{ padding: 32 }}>
        <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Flujo por Centro de Costo
        </h1>
        <div style={{ color: '#475569', fontSize: 13, marginBottom: 28 }}>
          Selecciona un CeCo para ver su flujo mensual, KPIs y todas sus transacciones
        </div>
        <CeCoSelector cecos={cecoOptions} current={null} />
      </div>
    )
  }

  const ceco = await prisma.costCenter.findUnique({
    where: { id: cecoId },
    include: { company: { select: { name: true } } },
  })
  if (!ceco) {
    return (
      <div className="q4-page" style={{ padding: 32 }}>
        <h1 style={{ color: '#0F1A2E', fontSize: 22 }}>CeCo no encontrado</h1>
        <Link href="/flujo-ceco" style={{ color: '#E5501E' }}>← Volver</Link>
      </div>
    )
  }

  const where = { costCenterId: cecoId }
  const [total, txs, byMovement, byStatus] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit, take: limit,
      include: {
        provider: { select: { name: true } },
        account: { select: { code: true, name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.transaction.groupBy({
      by: ['movementType'],
      where: { ...where, status: { not: 'NULO' } },
      _sum: { net: true, gross: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ['status'],
      where,
      _sum: { gross: true },
      _count: { _all: true },
    }),
  ])

  const ingresos = Number(byMovement.find(x => x.movementType === 'INGRESO')?._sum.net ?? 0)
  const egresos = Number(byMovement.find(x => x.movementType === 'EGRESO')?._sum.net ?? 0)
  const balance = ingresos - egresos
  const pendiente = Number(byStatus.find(x => x.status === 'PENDIENTE')?._sum.gross ?? 0)
  const pagado = Number(byStatus.find(x => x.status === 'PAGADO')?._sum.gross ?? 0)

  return (
    <div className="q4-page" style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16 }}>
        <CeCoSelector cecos={cecoOptions} current={cecoId} />
        <div style={{ paddingBottom: 4 }}>
          <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>Empresa</div>
          <div style={{ color: '#0F1A2E', fontSize: 13, marginTop: 4 }}>{ceco.company.name}</div>
        </div>
        {ceco.projectNumber && (
          <div style={{ paddingBottom: 4 }}>
            <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>N° Proyecto</div>
            <div style={{ color: '#0F1A2E', fontSize: 13, marginTop: 4 }}>{ceco.projectNumber}</div>
          </div>
        )}
        {ceco.location && (
          <div style={{ paddingBottom: 4 }}>
            <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ubicación</div>
            <div style={{ color: '#0F1A2E', fontSize: 13, marginTop: 4 }}>{ceco.location}</div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="q4-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total tx', value: total.toLocaleString('es-CL'), color: '#0F1A2E', plain: true },
          { label: 'Ingresos (neto)', value: formatCLP(ingresos), color: '#16A34A' },
          { label: 'Egresos (neto)', value: formatCLP(egresos), color: '#DC2626' },
          { label: 'Balance', value: formatCLP(balance), color: balance >= 0 ? '#16A34A' : '#DC2626' },
          { label: 'Pendiente pago', value: formatCLP(pendiente), color: '#CA8A04' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#FFFFFF', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px',
          }}>
            <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: k.plain ? 22 : 18, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Resumen pagado vs total */}
      {pagado + pendiente > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
          padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Estado de pagos</div>
          <div style={{ background: '#E2E8F0', borderRadius: 6, height: 12,
            overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(pagado/(pagado+pendiente))*100}%`, background: '#16A34A' }} />
            <div style={{ width: `${(pendiente/(pagado+pendiente))*100}%`, background: '#CA8A04' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#475569' }}>
            <span>✓ Pagado: <b style={{ color: '#16A34A' }}>{formatCLP(pagado)}</b></span>
            <span>⏳ Pendiente: <b style={{ color: '#CA8A04' }}>{formatCLP(pendiente)}</b></span>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <FlujoCecoChart cecoId={cecoId} />
      </div>

      {/* Tabla tx */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ color: '#0F1A2E', fontSize: 14, fontWeight: 700, margin: 0,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transacciones</h2>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Fecha', 'Descripción', 'Proveedor', 'Cuenta', 'Categoría', 'Tipo', 'Neto', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: h === 'Neto' ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, i) => (
              <tr key={tx.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : '#F8FAFC',
              }}>
                <td style={{ padding: '9px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                  <Link href={`/transacciones/${tx.id}/editar`} style={{ color: '#E5501E', textDecoration: 'none' }}>
                    {formatDate(tx.paymentDate)}
                  </Link>
                </td>
                <td style={{ padding: '9px 14px', color: '#0F1A2E', fontSize: 13, maxWidth: 280,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
                  {tx.description}
                </td>
                <td style={{ padding: '9px 14px', color: '#475569', fontSize: 12 }}>{tx.provider?.name ?? '—'}</td>
                <td style={{ padding: '9px 14px', color: '#475569', fontSize: 12 }}>{tx.account?.code ?? '—'}</td>
                <td style={{ padding: '9px 14px', color: '#94A3B8', fontSize: 12 }}>{tx.category?.name ?? '—'}</td>
                <td style={{ padding: '9px 14px', fontSize: 11 }}>
                  <span style={{
                    background: tx.movementType === 'INGRESO' ? '#F0FDF4' : 'rgba(192,57,43,0.18)',
                    color: tx.movementType === 'INGRESO' ? '#16A34A' : '#DC2626',
                    borderRadius: 4, padding: '2px 8px', fontWeight: 700,
                  }}>{tx.movementType}</span>
                </td>
                <td style={{ padding: '9px 14px', fontSize: 13,
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  color: tx.movementType === 'INGRESO' ? '#16A34A' : '#0F1A2E' }}>
                  {formatCLP(Number(tx.net))}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <StatusBadge txId={tx.id} status={tx.status} />
                </td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '32px 14px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  Sin transacciones en este CeCo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={total} page={page} limit={limit} />
    </div>
  )
}
