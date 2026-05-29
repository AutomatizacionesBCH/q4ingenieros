export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { AvanzarEstadoButton } from '@/components/propuestas/AvanzarEstadoButton'
import { EliminarPropuestaButton } from '@/components/propuestas/EliminarPropuestaButton'

const STATUS_COLOR: Record<string, string> = {
  BORRADOR: '#94A3B8', ENVIADA: '#CA8A04', ACEPTADA: '#16A34A',
}

type ContentJson = {
  items?: { descripcion?: string; monto?: number }[]
  observaciones?: string
}

export default async function PropuestasCierrePage() {
  const propuestas = await prisma.closingProposal.findMany({
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const enriched = propuestas.map(p => {
    const content = (p.content ?? {}) as ContentJson
    const items = content.items ?? []
    const total = items.reduce((s, it) => s + (Number(it.monto) || 0), 0)
    return { ...p, total, itemCount: items.length }
  })

  const totalGeneral = enriched.reduce((s, p) => s + p.total, 0)
  const aceptadas = enriched.filter(p => p.status === 'ACEPTADA')
  const totalAceptado = aceptadas.reduce((s, p) => s + p.total, 0)
  const enviadas = enriched.filter(p => p.status === 'ENVIADA').length
  const borradores = enriched.filter(p => p.status === 'BORRADOR').length

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>Propuestas de Cierre</h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {enriched.length} propuestas · {borradores} borradores · {enviadas} enviadas · {aceptadas.length} aceptadas
          </div>
        </div>
        <Link href="/propuestas-cierre/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nueva propuesta</Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total en propuestas', value: totalGeneral, color: '#0F1A2E' },
          { label: 'Total aceptado', value: totalAceptado, color: '#16A34A' },
          { label: 'Pendiente respuesta', value: totalGeneral - totalAceptado, color: '#CA8A04' },
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

      {enriched.length === 0 ? (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
          padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ color: '#94A3B8', fontSize: 14, marginBottom: 12 }}>Sin propuestas de cierre</div>
          <Link href="/propuestas-cierre/nueva" style={{
            color: '#E5501E', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>+ Crear primera propuesta</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {enriched.map(p => (
            <div key={p.id} style={{
              background: '#FFFFFF', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px',
              opacity: p.status === 'ACEPTADA' ? 0.85 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Link href={`/propuestas-cierre/${p.id}/editar`} style={{
                      color: '#E5501E', fontSize: 12, fontFamily: 'monospace', textDecoration: 'none',
                    }}>PC-{String(p.id).padStart(4, '0')}</Link>
                    <span style={{
                      background: STATUS_COLOR[p.status] + '22',
                      color: STATUS_COLOR[p.status],
                      borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                    }}>{p.status}</span>
                    <span style={{ color: '#94A3B8', fontSize: 11 }}>{formatDate(p.createdAt)}</span>
                  </div>
                  <div style={{ color: '#0F1A2E', fontSize: 14, fontWeight: 600, marginBottom: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description}
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>
                    {p.costCenter ? `${p.costCenter.code} · ${p.costCenter.name}` : 'Sin CeCo'}
                    {p.provider ? ` · ${p.provider.name}` : ''}
                    {' · '}{p.itemCount} ítems
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
                  flexShrink: 0 }}>
                  <div style={{ color: '#E5501E', fontSize: 18, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums' }}>
                    {formatCLP(p.total)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AvanzarEstadoButton id={p.id} currentStatus={p.status} />
                    <a href={`/api/pdf/propuesta/${p.id}`} target="_blank" rel="noopener noreferrer" style={{
                      background: '#F8FAFC', color: '#475569',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600,
                      textDecoration: 'none',
                    }}>PDF</a>
                    <Link href={`/propuestas-cierre/${p.id}/editar`} style={{
                      background: '#F8FAFC', color: '#475569',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600,
                      textDecoration: 'none',
                    }}>Editar</Link>
                    <EliminarPropuestaButton id={p.id} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
