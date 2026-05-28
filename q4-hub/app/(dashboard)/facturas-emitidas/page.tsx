export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { MarcarRecibidaButton } from '@/components/facturas/MarcarRecibidaButton'

const STATUS_COLORS: Record<string, string> = { PAGADO: '#3D8B5E', PENDIENTE: '#D4A017', NULO: '#5A7090' }

export default async function FacturasEmitidasPage() {
  const facturas = await prisma.issuedInvoice.findMany({
    include: {
      company: { select: { name: true } },
      costCenter: { select: { code: true, name: true } },
    },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  })

  const totalMonto = facturas.reduce((s, f) => s + Number(f.amount), 0)
  const totalRecibido = facturas.reduce((s, f) => s + Number(f.received), 0)
  const totalPendiente = totalMonto - totalRecibido

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>Facturas Emitidas</h1>
          <div style={{ color: '#8A9BB8', fontSize: 13, marginTop: 4 }}>
            {facturas.length} facturas · Pendiente cobro: <span style={{ color: '#D4A017', fontWeight: 700 }}>{formatCLP(totalPendiente)}</span>
          </div>
        </div>
        <Link href="/facturas-emitidas/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nueva factura</Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total facturado', value: formatCLP(totalMonto), color: '#F0EDE8' },
          { label: 'Total recibido', value: formatCLP(totalRecibido), color: '#3D8B5E' },
          { label: 'Pendiente cobro', value: formatCLP(totalPendiente), color: '#D4A017' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#162138', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px',
          }}>
            <div style={{ color: '#5A7090', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Emisión', 'N° EP', 'N° Factura', 'Empresa', 'CeCo', 'Monto', 'Recibido', 'Estado', 'Acción'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: ['Monto', 'Recibido'].includes(h) ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facturas.map((f, i) => {
              const pendiente = Number(f.amount) - Number(f.received)
              return (
                <tr key={f.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                    <Link href={`/facturas-emitidas/${f.id}/editar`} style={{ color: '#E5501E', textDecoration: 'none' }}>
                      {formatDate(f.issueDate)}
                    </Link>
                  </td>
                  <td style={{ padding: '9px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}>{f.epNumber ?? '—'}</td>
                  <td style={{ padding: '9px 14px', color: '#F0EDE8', fontSize: 13 }}>{f.invoiceNumber ?? '—'}</td>
                  <td style={{ padding: '9px 14px', color: '#8A9BB8', fontSize: 12 }}>{f.company.name.split(' ')[0]}</td>
                  <td style={{ padding: '9px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}>{f.costCenter?.code ?? '—'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#F0EDE8', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCLP(Number(f.amount))}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums',
                    color: pendiente <= 0 ? '#3D8B5E' : '#D4A017' }}>
                    {formatCLP(Number(f.received))}
                    {pendiente > 0 && (
                      <div style={{ fontSize: 10, color: '#5A7090' }}>falta {formatCLP(pendiente)}</div>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      background: STATUS_COLORS[f.status] + '22',
                      color: STATUS_COLORS[f.status],
                      borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                    }}>{f.status}</span>
                    {f.factoring && (
                      <span style={{
                        background: 'rgba(229,80,30,0.15)', color: '#E5501E',
                        borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, marginLeft: 4,
                      }}>FACT</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                    {f.status !== 'PAGADO' && (
                      <MarcarRecibidaButton id={f.id} amount={Number(f.amount)} />
                    )}
                  </td>
                </tr>
              )
            })}
            {facturas.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '32px 14px', textAlign: 'center', color: '#5A7090', fontSize: 13 }}>
                  Sin facturas emitidas — usa &ldquo;+ Nueva factura&rdquo; arriba
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
