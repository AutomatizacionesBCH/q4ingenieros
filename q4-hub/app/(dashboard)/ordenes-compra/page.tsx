export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP } from '@/lib/fmt'
import Link from 'next/link'
import { CerrarOCButton } from '@/components/ordenes-compra/CerrarOCButton'

const STATUS_COLOR: Record<string, string> = { ACTIVA: '#16A34A', CERRADA: '#94A3B8', CANCELADA: '#DC2626' }

export default async function OrdenesCompraPage() {
  const ocs = await prisma.purchaseOrder.findMany({
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true } },
      transactions: { select: { gross: true, status: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  const enriched = ocs.map(oc => {
    const pagado = oc.transactions.filter(t => t.status === 'PAGADO').reduce((s, t) => s + Number(t.gross), 0)
    const pendiente = oc.transactions.filter(t => t.status === 'PENDIENTE').reduce((s, t) => s + Number(t.gross), 0)
    return { ...oc, pagado, pendiente, saldo: Number(oc.total) - pagado - pendiente }
  })

  const totalOC = enriched.reduce((s, o) => s + Number(o.total), 0)
  const totalPagado = enriched.reduce((s, o) => s + o.pagado, 0)
  const totalSaldo = enriched.reduce((s, o) => s + o.saldo, 0)
  const activas = enriched.filter(o => o.status === 'ACTIVA').length

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>Órdenes de Compra</h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {enriched.length} OC · {activas} activas
          </div>
        </div>
        <Link href="/ordenes-compra/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nueva OC</Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total comprometido OC', value: totalOC, color: '#0F1A2E' },
          { label: 'Total pagado', value: totalPagado, color: '#16A34A' },
          { label: 'Saldo disponible', value: totalSaldo, color: totalSaldo >= 0 ? '#E5501E' : '#DC2626' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#FFFFFF', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px',
          }}>
            <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatCLP(k.value)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['ID', 'CeCo', 'Descripción', 'Proveedor', 'Total OC', 'Pagado', 'Saldo', 'Estado', 'Acción'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: ['Total OC', 'Pagado', 'Saldo'].includes(h) ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enriched.map((oc, i) => (
              <tr key={oc.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : '#F8FAFC',
                opacity: oc.status !== 'ACTIVA' ? 0.6 : 1,
              }}>
                <td style={{ padding: '10px 14px' }}>
                  <Link href={`/ordenes-compra/${oc.id}`} style={{ color: '#E5501E', fontSize: 12, fontFamily: 'monospace', textDecoration: 'none' }}>
                    OC-{String(oc.id).padStart(4, '0')}
                  </Link>
                </td>
                <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>{oc.costCenter?.code ?? '—'}</td>
                <td style={{ padding: '10px 14px', color: '#0F1A2E', fontSize: 13, maxWidth: 280,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={oc.description}>{oc.description}</td>
                <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>{oc.provider?.name ?? '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#0F1A2E', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(Number(oc.total))}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16A34A', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(oc.pagado)}
                  {oc.pendiente > 0 && (
                    <div style={{ fontSize: 10, color: '#CA8A04' }}>+{formatCLP(oc.pendiente)} pend.</div>
                  )}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right',
                  color: oc.saldo < 0 ? '#DC2626' : '#16A34A', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatCLP(oc.saldo)}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: STATUS_COLOR[oc.status] + '22',
                    color: STATUS_COLOR[oc.status],
                    borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                  }}>{oc.status}</span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                  <CerrarOCButton id={oc.id} currentStatus={oc.status} />
                </td>
              </tr>
            ))}
            {enriched.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '32px 14px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  Sin órdenes de compra — usa &ldquo;+ Nueva OC&rdquo; arriba
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
