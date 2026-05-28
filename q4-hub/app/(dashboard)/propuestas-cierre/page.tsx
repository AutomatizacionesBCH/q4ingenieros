export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/fmt'

const STATUS_COLOR: Record<string, string> = {
  BORRADOR: '#5A7090', ENVIADA: '#D4A017', ACEPTADA: '#3D8B5E',
}

export default async function PropuestasCierrePage() {
  const propuestas = await prisma.closingProposal.findMany({
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>Propuestas de Cierre</h1>
        <span style={{ color: '#8A9BB8', fontSize: 13 }}>{propuestas.length} propuestas</span>
      </div>

      {propuestas.length === 0 ? (
        <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
          padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ color: '#5A7090', fontSize: 14 }}>Sin propuestas de cierre</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {propuestas.map(p => (
            <div key={p.id} style={{
              background: '#162138', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ color: '#F0EDE8', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {p.description}
                </div>
                <div style={{ color: '#5A7090', fontSize: 12 }}>
                  {p.costCenter ? `${p.costCenter.code} · ${p.costCenter.name}` : '—'}
                  {p.provider ? ` · ${p.provider.name}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: '#5A7090', fontSize: 12 }}>{formatDate(p.createdAt)}</div>
                <span style={{
                  background: STATUS_COLOR[p.status] + '22',
                  color: STATUS_COLOR[p.status],
                  borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                }}>{p.status}</span>
                <a href={`/api/pdf/propuesta/${p.id}`} target="_blank" style={{
                  background: '#1D2D47', color: '#8A9BB8', borderRadius: 6,
                  padding: '5px 12px', fontSize: 12, textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>PDF</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
