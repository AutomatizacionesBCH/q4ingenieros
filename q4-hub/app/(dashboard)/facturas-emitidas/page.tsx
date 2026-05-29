export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { MarcarRecibidaButton } from '@/components/facturas/MarcarRecibidaButton'

const STATUS_COLORS: Record<string, string> = { PAGADO: '#16A34A', PENDIENTE: '#CA8A04', NULO: '#94A3B8' }

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
          <h1 style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>Facturas Emitidas</h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {facturas.length} facturas · Pendiente cobro: <span style={{ color: '#CA8A04', fontWeight: 700 }}>{formatCLP(totalPendiente)}</span>
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
          { label: 'Total facturado', value: formatCLP(totalMonto), color: '#0F1A2E' },
          { label: 'Total recibido', value: formatCLP(totalRecibido), color: '#16A34A' },
          { label: 'Pendiente cobro', value: formatCLP(totalPendiente), color: '#CA8A04' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#FFFFFF', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px',
          }}>
            <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Emisión', 'N° EP', 'N° Factura', 'Empresa', 'CeCo', 'Monto', 'Recibido', 'Estado', 'Acción'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: ['Monto', 'Recibido'].includes(h) ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facturas.map((f, i) => {
              const pendiente = Number(f.amount) - Number(f.received)
              return (
                <tr key={f.i