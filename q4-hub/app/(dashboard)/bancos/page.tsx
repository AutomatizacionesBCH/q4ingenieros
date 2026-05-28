export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'

export default async function BancosPage() {
  const saldos = await prisma.bankBalance.findMany({
    include: { company: { select: { name: true } } },
    orderBy: { recordedAt: 'desc' },
    take: 50,
  })

  const BANK_LABELS: Record<string, string> = {
    CHILE: 'Banco de Chile', BCI: 'BCI', ITAU: 'Itaú', SANTANDER: 'Santander',
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>Bancos</h1>
      </div>

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Banco', 'Empresa', 'Tipo', 'Saldo', 'Fecha registro'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: h === 'Saldo' ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {saldos.map((s, i) => (
              <tr key={s.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '10px 16px', color: '#F0EDE8', fontSize: 13, fontWeight: 600 }}>
                  {BANK_LABELS[s.bank] ?? s.bank}
                </td>
                <td style={{ padding: '10px 16px', color: '#8A9BB8', fontSize: 13 }}>{s.company.name}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    background: s.type === 'CONTABLE' ? 'rgba(61,139,94,0.15)' : 'rgba(212,160,23,0.15)',
                    color: s.type === 'CONTABLE' ? '#3D8B5E' : '#D4A017',
                    borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                  }}>{s.type}</span>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#F0EDE8',
                  fontSize: 14, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {formatCLP(Number(s.balance))}
                </td>
                <td style={{ padding: '10px 16px', color: '#5A7090', fontSize: 12 }}>
                  {formatDate(s.recordedAt)}
                </td>
              </tr>
            ))}
            {saldos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#5A7090', fontSize: 13 }}>
                  Sin saldos bancarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
