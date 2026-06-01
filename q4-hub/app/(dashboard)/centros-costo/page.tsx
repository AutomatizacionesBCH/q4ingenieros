export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DeleteMaestroButton } from '@/components/maestros/DeleteMaestroButton'
import { EditableCell } from '@/components/inline/EditableCell'
import { getCompanies } from '@/lib/maestros-cache'

export default async function CentroCostoPage() {
  const [cecos, companies] = await Promise.all([
    prisma.costCenter.findMany({
      include: {
        company: { select: { name: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { code: 'asc' },
    }),
    getCompanies(),
  ])
  const companyOpts = companies.map(c => ({ value: c.id, label: c.name }))

  return (
    <div className="q4-page" style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Centros de Costo
          </h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{cecos.length} registros</div>
        </div>
        <Link href="/centros-costo/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nuevo CeCo</Link>
      </div>

      <div style={{
        background: '#FFFFFF', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Código', 'Nombre', 'Empresa', 'N° Proyecto', 'Ubicación', 'Tx', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: h === 'Tx' ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cecos.map((c, i) => {
              const ep = `/api/maestros/ceco/${c.id}`
              return (
                <tr key={c.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : '#F8FAFC',
                }}>
                  <td style={{ padding: '4px 12px', fontSize: 13, fontFamily: 'monospace' }}>
                    <EditableCell txId={c.id} field="code" kind="text" endpoint={ep}
                      value={c.code} fontFamily="monospace" color="#E5501E"
                      display={<span style={{ color: '#E5501E', fontFamily: 'monospace' }}>{c.code}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', color: '#0F1A2E', fontSize: 13 }}>
                    <EditableCell txId={c.id} field="name" kind="text" endpoint={ep}
                      value={c.name} display={<span style={{ color: '#0F1A2E' }}>{c.name}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', minWidth: 150 }}>
                    <EditableCell txId={c.id} field="companyId" kind="select" endpoint={ep}
                      value={c.companyId} options={companyOpts}
                      display={<span style={{ color: '#475569', fontSize: 12 }}>{c.company.name}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', color: '#475569', fontSize: 12 }}>
                    <EditableCell txId={c.id} field="projectNumber" kind="text" endpoint={ep}
                      value={c.projectNumber ?? ''} display={<span style={{ color: '#475569' }}>{c.projectNumber ?? '—'}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', color: '#475569', fontSize: 12 }}>
                    <EditableCell txId={c.id} field="location" kind="text" endpoint={ep}
                      value={c.location ?? ''} display={<span style={{ color: '#475569' }}>{c.location ?? '—'}</span>} />
                  </td>
                  <td style={{ padding: '10px 16px', color: '#94A3B8', fontSize: 11, textAlign: 'right' }}>
                    {c._count.transactions.toLocaleString('es-CL')}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <DeleteMaestroButton url={`/api/maestros/ceco/${c.id}`} label={`el CeCo ${c.code}`} />
                  </td>
                </tr>
              )
            })}
            {cecos.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
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
