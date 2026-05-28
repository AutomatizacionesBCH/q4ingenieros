export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP } from '@/lib/fmt'
import Link from 'next/link'

export default async function OrdenesCompraPage() {
  const ocs = await prisma.purchaseOrder.findMany({
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true } },
      transactions: { select: { gross: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const enriched = ocs.map(oc => {
    const gastado = oc.transactions.filter(t => t.status === 'PAGADO').reduce((s, t) => s + Number(t.gross), 0)
    return { ...oc, gastado, saldo: Number(oc.total) - gastado }
  })

  const STATUS_COLOR: Record<string, string> = { ACTIVA: '#3D8B5E', CERRADA: '#5A7090', CANCELADA: '#C0392B' }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>Órdenes de Compra</h1>
        <a href="/ordenes-compra/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nueva OC</a>
      </div>

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['ID', 'CeCo', 'Descripción', 'Proveedor', 'Total OC', 'Gastado', 'Saldo', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: ['Total OC', 'Gastado', 'Saldo'].includes(h) ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enriched.map((oc, i) => (
              <tr key={oc.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '10px 14px' }}>
                  <Link href={`/ordenes-compra/${oc.id}`} style={{ color: '#E5501E', fontSize: 12, fontFamily: 'monospace', textDecoration: 'none' }}>
                    OC-{String(oc.id).padStart(4, '0')}
                  </Link>
                </td>
                <td style={{ padding: '10px 14px', color: '#8A9BB8', fontSize: 12 }}>{oc.costCenter?.code ?? '—'}</td>
                <td style={{ padding: '10px 14px', color: '#F0EDE8', fontSize: 13, maxWidth: 260,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oc.description}</td>
                <td style={{ padding: '10px 14px', color: '#8A9BB8', fontSize: 12 }}>{oc.provider?.name ?? '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#F0EDE8', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(Number(oc.total))}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#D4A017', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(oc.gastado)}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right',
                  color: oc.saldo < 0 ? '#C0392B' : '#3D8B5E', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatCLP(oc.saldo)}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: STATUS_COLOR[oc.status] + '22',
                    color: STATUS_COLOR[oc.status],
                    borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                  }}>{oc.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
