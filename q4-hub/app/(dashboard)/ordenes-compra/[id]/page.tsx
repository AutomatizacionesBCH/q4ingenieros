export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { CerrarOCButton } from '@/components/ordenes-compra/CerrarOCButton'

const STATUS_COLOR: Record<string, string> = {
  ACTIVA: '#3D8B5E', CERRADA: '#5A7090', CANCELADA: '#C0392B',
}
const TX_STATUS_COLOR: Record<string, string> = {
  PAGADO: '#3D8B5E', PENDIENTE: '#D4A017', NULO: '#5A7090',
}

export default async function OCDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ocId = Number(id)
  if (!Number.isFinite(ocId)) notFound()

  const oc = await prisma.purchaseOrder.findUnique({
    where: { id: ocId },
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true, rut: true } },
      transactions: {
        include: {
          provider: { select: { name: true } },
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      },
    },
  })

  if (!oc) notFound()

  const company = await prisma.company.findUnique({ where: { id: oc.companyId }, select: { name: true } })

  const total = Number(oc.total)
  const pagado = oc.transactions.filter(t => t.status === 'PAGADO').reduce((s, t) => s + Number(t.gross), 0)
  const pendiente = oc.transactions.filter(t => t.status === 'PENDIENTE').reduce((s, t) => s + Number(t.gross), 0)
  const comprometido = pagado + pendiente
  const saldo = total - comprometido
  const pctPagado = total > 0 ? Math.min(100, (pagado / total) * 100) : 0
  const pctPendiente = total > 0 ? Math.min(100 - pctPagado, (pendiente / total) * 100) : 0

  return (
    <div style={{ padding: 32, maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Link href="/ordenes-compra" style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
            ← Órdenes de Compra
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
            <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0,
              fontFamily: 'monospace' }}>
              OC-{String(oc.id).padStart(4, '0')}
            </h1>
            <span style={{
              background: STATUS_COLOR[oc.status] + '22',
              color: STATUS_COLOR[oc.status],
              borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700,
            }}>{oc.status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <CerrarOCButton id={oc.id} currentStatus={oc.status} />
          <Link href={`/ordenes-compra/${oc.id}/editar`} style={{
            background: '#1D2D47', color: '#8A9BB8', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '7px 14px', fontSize: 12, textDecoration: 'none',
          }}>Editar</Link>
        </div>
      </div>

      {/* Detalle */}
      <section style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
        padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          {[
            { label: 'Empresa', value: company?.name ?? '—' },
            { label: 'Centro de Costo', value: oc.costCenter ? `${oc.costCenter.code} · ${oc.costCenter.name}` : '—' },
            { label: 'Proveedor', value: oc.provider?.name ?? '—' },
            { label: 'Creada', value: formatDate(oc.createdAt) },
          ].map(d => (
            <div key={d.label}>
              <div style={{ color: '#5A7090', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{d.label}</div>
              <div style={{ color: '#F0EDE8', fontSize: 13 }}>{d.value}</div>
            </div>
          ))}
        </div>

        <div style={{ color: '#5A7090', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Descripción</div>
        <div style={{ color: '#F0EDE8', fontSize: 14, whiteSpace: 'pre-wrap' }}>{oc.description}</div>
      </section>

      {/* KPIs + Barra */}
      <section style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
        padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { label: 'Total OC', value: total, color: '#F0EDE8' },
            { label: 'Pagado', value: pagado, color: '#3D8B5E' },
            { label: 'Pendiente', value: pendiente, color: '#D4A017' },
            { label: 'Saldo disponible', value: saldo, color: saldo >= 0 ? '#E5501E' : '#C0392B' },
          ].map(k => (
            <div key={k.label}>
              <div style={{ color: '#5A7090', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ color: k.color, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {formatCLP(k.value)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 10,
          overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${pctPagado}%`, background: '#3D8B5E' }} />
          <div style={{ width: `${pctPendiente}%`, background: '#D4A017' }} />
        </div>
        <div style={{ color: '#5A7090', fontSize: 11, marginTop: 6 }}>
          {pctPagado.toFixed(1)}% pagado · {pctPendiente.toFixed(1)}% pendiente · {(100 - pctPagado - pctPendiente).toFixed(1)}% libre
        </div>
      </section>

      {/* Tx asociadas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ color: '#F0EDE8', fontSize: 14, fontWeight: 700, margin: 0,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Transacciones asociadas
        </h2>
        <span style={{ color: '#5A7090', fontSize: 11 }}>{oc.transactions.length} tx</span>
      </div>

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Fecha', 'Descripción', 'Proveedor', 'Bruto', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: h === 'Bruto' ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {oc.transactions.map((tx, i) => (
              <tr key={tx.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                  <Link href={`/transacciones/${tx.id}/editar`} style={{ color: '#E5501E', textDecoration: 'none' }}>
                    {formatDate(tx.paymentDate)}
                  </Link>
                </td>
                <td style={{ padding: '10px 14px', color: '#F0EDE8', fontSize: 13 }}>{tx.description}</td>
                <td style={{ padding: '10px 14px', color: '#8A9BB8', fontSize: 12 }}>{tx.provider?.name ?? '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#F0EDE8', fontSize: 13,
                  fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatCLP(Number(tx.gross))}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: TX_STATUS_COLOR[tx.status] + '22',
                    color: TX_STATUS_COLOR[tx.status],
                    borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                  }}>{tx.status}</span>
                </td>
              </tr>
            ))}
            {oc.transactions.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px 14px', textAlign: 'center', color: '#5A7090', fontSize: 13 }}>
                  Sin transacciones asociadas a esta OC. Crea una en /transacciones/nueva
                  y vincúlala desde el campo &ldquo;Orden de compra&rdquo; (proximamente).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
