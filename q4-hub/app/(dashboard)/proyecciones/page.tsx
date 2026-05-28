export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'

export default async function ProyeccionesPage() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)

  const pagosViernes = await prisma.transaction.findMany({
    where: {
      status: 'PENDIENTE', movementType: 'EGRESO',
      paymentDate: { gte: monday, lte: friday },
    },
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true } },
      company: { select: { name: true } },
    },
    orderBy: { gross: 'desc' },
  })

  const total = pagosViernes.reduce((s, t) => s + Number(t.gross), 0)

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>Proyecciones</h1>
          <div style={{ color: '#8A9BB8', fontSize: 13, marginTop: 4 }}>
            Semana: {formatDate(monday)} → {formatDate(friday)}
          </div>
        </div>
        <div style={{ background: '#162138', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '16px 24px', textAlign: 'right' }}>
          <div style={{ color: '#5A7090', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total a pagar viernes
          </div>
          <div style={{ color: '#D4A017', fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
            {formatCLP(total)}
          </div>
          <div style={{ color: '#8A9BB8', fontSize: 12, marginTop: 2 }}>{pagosViernes.length} transacciones</div>
        </div>
      </div>

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Fecha', 'CeCo', 'Descripción', 'Proveedor', 'Bruto', 'Banco', 'Doc.'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: h === 'Bruto' ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagosViernes.map((tx, i) => (
              <tr key={tx.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '10px 14px', color: '#8A9BB8', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {formatDate(tx.paymentDate)}
                </td>
                <td style={{ padding: '10px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}>
                  {tx.costCenter?.code ?? '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#F0EDE8', fontSize: 13, maxWidth: 240,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                </td>
                <td style={{ padding: '10px 14px', color: '#8A9BB8', fontSize: 12 }}>
                  {tx.provider?.name ?? '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#F0EDE8', fontSize: 13,
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatCLP(Number(tx.gross))}
                </td>
                <td style={{ padding: '10px 14px', color: '#8A9BB8', fontSize: 12 }}>
                  {tx.bank ?? '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#5A7090', fontSize: 12 }}>
                  {tx.facturaNum ?? tx.boletaNum ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', background: 'rgba(229,80,30,0.06)' }}>
              <td colSpan={4} style={{ padding: '12px 14px', color: '#8A9BB8', fontSize: 12, fontWeight: 700 }}>TOTAL</td>
              <td style={{ padding: '12px 14px', color: '#E5501E', fontSize: 15,
                textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                {formatCLP(total)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
