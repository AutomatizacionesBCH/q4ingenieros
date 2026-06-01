export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { AvanzarEstadoButton } from '@/components/propuestas/AvanzarEstadoButton'
import { EliminarPropuestaButton } from '@/components/propuestas/EliminarPropuestaButton'
import { EditableCell } from '@/components/inline/EditableCell'
import { CecoAutocomplete } from '@/components/inline/CecoAutocomplete'
import { ProveedorAutocomplete } from '@/components/inline/ProveedorAutocomplete'
import { getCecos, getProviders } from '@/lib/maestros-cache'

const STATUS_COLOR: Record<string, string> = {
  BORRADOR: '#94A3B8', ENVIADA: '#CA8A04', ACEPTADA: '#16A34A',
}
const ESTADO_OPTS = [
  { value: 'BORRADOR', label: 'BORRADOR' },
  { value: 'ENVIADA', label: 'ENVIADA' },
  { value: 'ACEPTADA', label: 'ACEPTADA' },
]

type ContentJson = {
  items?: { descripcion?: string; monto?: number }[]
  observaciones?: string
}

export default async function PropuestasCierrePage() {
  const [propuestas, cecos, providers] = await Promise.all([
    prisma.closingProposal.findMany({
      include: {
        costCenter: { select: { code: true, name: true } },
        provider: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getCecos(),
    getProviders(),
  ])
  const cecoList = cecos.map(c => ({ id: c.id, code: c.code, name: c.name }))
  const providerList = providers.map(p => ({ id: p.id, name: p.name }))

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
    <div className="q4-page" style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>Propuestas de Cierre</h1>
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
      <div className="q4-kpi-grid q4-kpi-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
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

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['N°', 'Estado', 'Fecha', 'Descripción', 'CeCo', 'Proveedor', 'Ítems', 'Total', 'Acción'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: ['Total', 'Ítems'].includes(h) ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enriched.map((p, i) => {
              const ep = `/api/propuestas-cierre/${p.id}`
              return (
                <tr key={p.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : '#F8FAFC',
                }}>
                  <td style={{ padding: '8px 14px' }}>
                    <Link href={`/propuestas-cierre/${p.id}/editar`} style={{ color: '#E5501E', fontSize: 12, fontFamily: 'monospace', textDecoration: 'none' }}>
                      PC-{String(p.id).padStart(4, '0')}
                    </Link>
                  </td>
                  <td style={{ padding: '2px 8px', minWidth: 120 }}>
                    <EditableCell txId={p.id} field="status" kind="select" endpoint={ep} stringValue
                      value={p.status} options={ESTADO_OPTS}
                      display={
                        <span style={{
                          background: STATUS_COLOR[p.status] + '22', color: STATUS_COLOR[p.status],
                          borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                        }}>{p.status}</span>
                      } />
                  </td>
                  <td style={{ padding: '8px 14px', color: '#94A3B8', fontSize: 11, whiteSpace: 'nowrap' }}>{formatDate(p.createdAt)}</td>
                  <td style={{ padding: '2px 8px', maxWidth: 260 }}>
                    <EditableCell txId={p.id} field="description" kind="text" endpoint={ep}
                      value={p.description}
                      display={<span style={{ color: '#0F1A2E', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={p.description}>{p.description}</span>} />
                  </td>
                  <td style={{ padding: '2px 8px' }}>
                    <CecoAutocomplete txId={p.id} endpoint={ep}
                      currentCode={p.costCenter?.code ?? null} currentId={p.costCenterId ?? null} cecos={cecoList} />
                  </td>
                  <td style={{ padding: '2px 8px', maxWidth: 170 }}>
                    <ProveedorAutocomplete txId={p.id} endpoint={ep}
                      currentName={p.provider?.name ?? null} currentId={p.providerId ?? null} providers={providerList} />
                  </td>
                  <td style={{ padding: '8px 14px', color: '#94A3B8', fontSize: 12, textAlign: 'right' }}>{p.itemCount}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: '#E5501E', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCLP(p.total)}
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <AvanzarEstadoButton id={p.id} currentStatus={p.status} />
                      <a href={`/api/pdf/propuesta/${p.id}`} target="_blank" rel="noopener noreferrer" style={{
                        background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0',
                        borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, textDecoration: 'none',
                      }}>PDF</a>
                      <Link href={`/propuestas-cierre/${p.id}/editar`} style={{
                        background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0',
                        borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, textDecoration: 'none',
                      }}>Ítems</Link>
                      <EliminarPropuestaButton id={p.id} />
                    </div>
                  </td>
                </tr>
              )
            })}
            {enriched.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '40px 14px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  Sin propuestas de cierre — usa &ldquo;+ Nueva propuesta&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
