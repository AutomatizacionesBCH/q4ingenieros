export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'

const STATUS_COLORS: Record<string, string> = { PAGADO: '#3D8B5E', PENDIENTE: '#D4A017', NULO: '#5A7090' }

export default async function FacturasEmitidasPage() {
  const facturas = await prisma.issuedInvoice.findMany({
    include: {
      company: { select: { name: true } },
      costCenter: { select: { code: true, name: true } },
    },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>Facturas Emitidas</h1>
        <span style={{ color: '#8A9BB8', fontSize: 13 }}>{facturas.length} registros</span>
      </div>

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['N° EP', 'N° Factura', 'Empresa', 'CeCo', 'Monto', 'Recibido', 'Emisión', 'Vencimiento', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: ['Monto', 'Recibido'].includes(h) ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facturas.map((f, i) => (
              <tr key={f.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '9px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}>{f.epNumber ?? '—'}</td>
                <td style={{ padding: '9px 14px', color: '#F0EDE8', fontSize: 13 }}>{f.invoiceNumber ?? '—'}</td>
                <td style={{ padding: '9px 14px', color: '#8A9BB8', fontSize: 12 }}>{f.company.name.split(' ')[0]}</td>
                <td style={{ padding: '9px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}>{f.costCenter?.code ?? '—'}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', color: '#F0EDE8', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(Number(f.amount))}
                </td>
                <td style={{ padding: '9px 14px', textAlign: 'right', color: '#3D8B5E', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(Number(f.received))}
                </td>
                <td style={{ padding: '9px 14px', color: '#8A9BB8', fontSize: 12 }}>{formatDate(f.issueDate)}</td>
                <td style={{ padding: '9px 14px', color: '#8A9BB8', fontSize: 12 }}>{formatDate(f.paymentDate)}</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{
                    background: STATUS_COLORS[f.status] + '22',
                    color: STATUS_COLORS[f.status],
                    borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                  }}>{f.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
