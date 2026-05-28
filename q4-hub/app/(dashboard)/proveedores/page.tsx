export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DeleteMaestroButton } from '@/components/maestros/DeleteMaestroButton'

export default async function ProveedoresPage() {
  const providers = await prisma.provider.findMany({
    include: {
      _count: { select: { transactions: true, purchaseOrders: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>Proveedores</h1>
          <div style={{ color: '#8A9BB8', fontSize: 13, marginTop: 4 }}>{providers.length} registrados</div>
        </div>
        <Link href="/proveedores/nuevo" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nuevo proveedor</Link>
      </div>

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Razón social', 'RUT', 'Email', 'Teléfono', 'Tx', 'OC', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: ['Tx', 'OC'].includes(h) ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => (
              <tr key={p.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>
                  <Link href={`/proveedores/${p.id}/editar`} style={{ color: '#E5501E', textDecoration: 'none', fontWeight: 600 }}>
                    {p.name}
                  </Link>
                </td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12, fontFamily: 'monospace' }}>{p.rut}</td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12 }}>{p.email ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 12 }}>{p.phone ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: '#5A7090', fontSize: 11, textAlign: 'right' }}>
                  {p._count.transactions.toLocaleString('es-CL')}
                </td>
                <td style={{ padding: '10px 16px', color: '#5A7090', fontSize: 11, textAlign: 'right' }}>
                  {p._count.purchaseOrders}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <DeleteMaestroButton url={`/api/maestros/proveedores/${p.id}`} label={`el proveedor ${p.name}`} />
                </td>
              </tr>
            ))}
            {providers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#5A7090', fontSize: 13 }}>
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
