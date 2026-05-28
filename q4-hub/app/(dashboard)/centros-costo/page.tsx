export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export default async function CentroCostoPage() {
  const cecos = await prisma.costCenter.findMany({
    include: { company: { select: { name: true } } },
    orderBy: { code: 'asc' },
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>
          Centros de Costo
        </h1>
        <span style={{ color: '#8A9BB8', fontSize: 13 }}>{cecos.length} registros</span>
      </div>

      <div style={{
        background: '#162138', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Código', 'Nombre', 'Empresa', 'N° Proyecto', 'Ubicación'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cecos.map((c, i) => (
              <tr key={c.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '10px 16px', color: '#E5501E', fontSize: 13, fontFamily: 'monospace' }}>{c.code}</td>
                <td style={{ padding: '10px 16px', color: '#F0EDE8', fontSize: 13 }}>{c.name}</td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12 }}>{c.company.name}</td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12 }}>{c.projectNumber ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12 }}>{c.location ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
