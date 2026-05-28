export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export default async function PlanCuentasPage() {
  const accounts = await prisma.account.findMany({
    include: { categories: true },
    orderBy: { code: 'asc' },
  })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>
          Plan de Cuentas
        </h1>
        <span style={{ color: '#8A9BB8', fontSize: 13 }}>{accounts.length} cuentas</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {accounts.map(account => (
          <div key={account.id} style={{
            background: '#162138', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: account.categories.length ? 12 : 0 }}>
              <span style={{ color: '#E5501E', fontFamily: 'monospace', fontSize: 13 }}>{account.code}</span>
              <span style={{ color: '#F0EDE8', fontSize: 14, fontWeight: 600 }}>{account.name}</span>
              <span style={{
                marginLeft: 'auto',
                background: account.movementType === 'INGRESO' ? 'rgba(61,139,94,0.2)' : 'rgba(192,57,43,0.2)',
                color: account.movementType === 'INGRESO' ? '#3D8B5E' : '#C0392B',
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              }}>
                {account.movementType}
              </span>
            </div>
            {account.categories.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {account.categories.map(cat => (
                  <span key={cat.id} style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#8A9BB8', fontSize: 11, padding: '3px 10px', borderRadius: 4,
                  }}>
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
