export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DeleteMaestroButton } from '@/components/maestros/DeleteMaestroButton'

export default async function CentroCostoPage() {
  const cecos = await prisma.costCenter.findMany({
    include: {
      company: { select: { name: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: { code: 'asc' },
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Centros de Costo
          </h1>
          <div style={{ color: '#8A9BB8', fontSize: 13, marginTop: 4 }}>{cecos.length} registros</div>
        </div>
        <Link href="/centros-costo/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nuevo CeCo</Link>
      </div>

      <div style={{
        background: '#162138', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Código', 'Nombre', 'Empresa', 'N° Proyecto', 'Ubicación', 'Tx', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: h === 'Tx' ? 'right' : 'left',
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
                <td style={{ padding: '10px 16px', fontSize: 13, fontFamily: 'monospace' }}>
                  <Link href={`/centros-costo/${c.id}/editar`} style={{ color: '#E5501E', textDecoration: 'none' }}>
                    {c.code}
                  </Link>
                </td>
                <td style={{ padding: '10px 16px', color: '#F0EDE8', fontSize: 13 }}>{c.name}</td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12 }}>{c.company.name}</td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12 }}>{c.projectNumber ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12 }}>{c.location ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: '#5A7090', fontSize: 11, textAlign: 'right' }}>
                  {c._count.transactions.toLocaleString('es-CL')}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <DeleteMaestroButton url={`/api/maestros/ceco/${c.id}`} label={`el CeCo ${c.code}`} />
                </td>
              </tr>
            ))}
            {cecos.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#5A7090', fontSize: 13 }}>
                  Sin centros de costo — usa &ldquo;+ Nuevo CeCo&rdquo; arriba
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
