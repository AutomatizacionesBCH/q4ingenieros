export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DeleteMaestroButton } from '@/components/maestros/DeleteMaestroButton'
import { EditableCell } from '@/components/inline/EditableCell'

export default async function ProveedoresPage() {
  const providers = await prisma.provider.findMany({
    include: {
      _count: { select: { transactions: true, purchaseOrders: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="q4-page" style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>Proveedores</h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{providers.length} registrados</div>
        </div>
        <Link href="/proveedores/nuevo" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nuevo proveedor</Link>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Razón social', 'RUT', 'Email', 'Teléfono', 'Tx', 'OC', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: ['Tx', 'OC'].includes(h) ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => {
              const ep = `/api/maestros/proveedores/${p.id}`
              return (
                <tr key={p.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : '#F8FAFC',
                }}>
                  <td style={{ padding: '4px 12px', fontSize: 13, minWidth: 180 }}>
                    <EditableCell txId={p.id} field="name" kind="text" endpoint={ep}
                      value={p.name} fontWeight={600} color="#0F1A2E"
                      display={<span style={{ color: '#0F1A2E', fontWeight: 600 }}>{p.name}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
                    <EditableCell txId={p.id} field="rut" kind="text" endpoint={ep}
                      value={p.rut} fontFamily="monospace"
                      display={<span style={{ color: '#475569', fontFamily: 'monospace' }}>{p.rut}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', color: '#475569', fontSize: 12, minWidth: 160 }}>
                    <EditableCell txId={p.id} field="email" kind="text" endpoint={ep}
                      value={p.email ?? ''} display={<span style={{ color: '#475569' }}>{p.email ?? '—'}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', color: '#475569', fontSize: 12 }}>
                    <EditableCell txId={p.id} field="phone" kind="text" endpoint={ep}
                      value={p.phone ?? ''} display={<span style={{ color: '#475569' }}>{p.phone ?? '—'}</span>} />
                  </td>
                  <td style={{ padding: '10px 16px', color: '#94A3B8', fontSize: 11, textAlign: 'right' }}>
                    {p._count.transactions.toLocaleString('es-CL')}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#94A3B8', fontSize: 11, textAlign: 'right' }}>
                    {p._count.purchaseOrders}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <DeleteMaestroButton url={`/api/maestros/proveedores/${p.id}`} label={`el proveedor ${p.name}`} />
                  </td>
                </tr>
              )
            })}
            {providers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  Sin proveedores — usa &ldquo;+ Nuevo proveedor&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
