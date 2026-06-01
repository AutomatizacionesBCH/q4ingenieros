export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DeleteMaestroButton } from '@/components/maestros/DeleteMaestroButton'
import { EditableCell } from '@/components/inline/EditableCell'

const TIPO_OPTS = [
  { value: 'INGRESO', label: 'INGRESO' },
  { value: 'EGRESO', label: 'EGRESO' },
]

export default async function PlanCuentasPage() {
  const accounts = await prisma.account.findMany({
    include: {
      categories: { orderBy: { name: 'asc' } },
      _count: { select: { transactions: true } },
    },
    orderBy: { code: 'asc' },
  })

  const ingresos = accounts.filter(a => a.movementType === 'INGRESO')
  const egresos = accounts.filter(a => a.movementType === 'EGRESO')

  return (
    <div className="q4-page" style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Plan de Cuentas
          </h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {accounts.length} cuentas · {ingresos.length} ingresos · {egresos.length} egresos · <span style={{ color: '#94A3B8' }}>clic en una celda para editar</span>
          </div>
        </div>
        <Link href="/plan-cuentas/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nueva cuenta</Link>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Código', 'Nombre', 'Tipo', 'Categorías', 'Tx', 'Acción'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: h === 'Tx' ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((account, i) => {
              const ep = `/api/maestros/cuentas/${account.id}`
              return (
                <tr key={account.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : '#F8FAFC',
                }}>
                  <td style={{ padding: '4px 12px', minWidth: 90 }}>
                    <EditableCell txId={account.id} field="code" kind="text" endpoint={ep}
                      value={account.code} fontFamily="monospace" color="#E5501E"
                      display={<span style={{ color: '#E5501E', fontFamily: 'monospace', fontSize: 13 }}>{account.code}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', minWidth: 200 }}>
                    <EditableCell txId={account.id} field="name" kind="text" endpoint={ep}
                      value={account.name} fontWeight={600}
                      display={<span style={{ color: '#0F1A2E', fontSize: 14, fontWeight: 600 }}>{account.name}</span>} />
                  </td>
                  <td style={{ padding: '4px 12px', minWidth: 120 }}>
                    <EditableCell txId={account.id} field="movementType" kind="select" endpoint={ep} stringValue
                      value={account.movementType} options={TIPO_OPTS}
                      display={
                        <span style={{
                          background: account.movementType === 'INGRESO' ? '#F0FDF4' : '#FECACA',
                          color: account.movementType === 'INGRESO' ? '#16A34A' : '#DC2626',
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        }}>{account.movementType}</span>
                      } />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    {account.categories.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {account.categories.map(cat => (
                          <span key={cat.id} style={{
                            background: '#E2E8F0', color: '#475569', fontSize: 11, padding: '3px 10px', borderRadius: 4,
                          }}>{cat.name}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 16px', color: '#94A3B8', fontSize: 11, textAlign: 'right' }}>
                    {account._count.transactions.toLocaleString('es-CL')}
                  </td>
                  <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                    <Link href={`/plan-cuentas/${account.id}/editar`} style={{
                      background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0',
                      borderRadius: 6, padding: '3px 10px', fontSize: 11, textDecoration: 'none', marginRight: 6,
                    }}>Categorías</Link>
                    <DeleteMaestroButton url={`/api/maestros/cuentas/${account.id}`} label={`la cuenta ${account.code}`} />
                  </td>
                </tr>
              )
            })}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  Sin cuentas — usa &ldquo;+ Nueva cuenta&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
