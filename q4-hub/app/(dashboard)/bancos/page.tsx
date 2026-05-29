export const revalidate = 0

import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { RegistroSaldoForm } from '@/components/bancos/RegistroSaldoForm'
import { DeleteSaldoButton } from '@/components/bancos/DeleteSaldoButton'

const BANK_LABELS: Record<string, string> = {
  CHILE: 'Banco de Chile', BCI: 'BCI', ITAU: 'Itaú', SANTANDER: 'Santander',
}
const BANKS: Array<'CHILE' | 'BCI' | 'ITAU' | 'SANTANDER'> = ['CHILE', 'BCI', 'ITAU', 'SANTANDER']

export default async function BancosPage() {
  const [companies, saldos] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.bankBalance.findMany({
      include: { company: { select: { id: true, name: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    }),
  ])

  // Calcular saldo actual (último registro) por banco + empresa + tipo
  type LatestKey = string
  const latest = new Map<LatestKey, typeof saldos[number]>()
  for (const s of saldos) {
    const key = `${s.bank}|${s.companyId}|${s.type}`
    if (!latest.has(key)) latest.set(key, s)
  }

  // Totales por banco (sumando empresas, solo CONTABLE)
  const totalsByBank = new Map<string, number>()
  for (const s of latest.values()) {
    if (s.type !== 'CONTABLE') continue
    totalsByBank.set(s.bank, (totalsByBank.get(s.bank) ?? 0) + Number(s.balance))
  }
  const totalContable = Array.from(totalsByBank.values()).reduce((a, b) => a + b, 0)

  return (
    <div className="q4-page" style={{ padding: 32 }}>
      <div className="q4-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>Bancos</h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            Saldo contable total: <span style={{ color: '#16A34A', fontWeight: 700 }}>{formatCLP(totalContable)}</span>
          </div>
        </div>
        <RegistroSaldoForm companies={companies} />
      </div>

      {/* Cards: saldo actual por banco */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 14, marginBottom: 28 }}>
        {BANKS.map(bank => {
          const total = totalsByBank.get(bank) ?? 0
          const filas = Array.from(latest.values()).filter(s => s.bank === bank && s.type === 'CONTABLE')
          return (
            <div key={bank} style={{
              background: '#FFFFFF', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)', padding: '16px 18px',
            }}>
              <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {BANK_LABELS[bank]}
              </div>
              <div style={{ color: total >= 0 ? '#0F1A2E' : '#DC2626', fontSize: 20, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums', marginBottom: 10 }}>
                {formatCLP(total)}
              </div>
              {filas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filas.map(f => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#475569' }}>{f.company.name.split(' ')[0]}</span>
                      <span style={{ color: '#0F1A2E', fontVariantNumeric: 'tabular-nums' }}>{formatCLP(Number(f.balance))}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94A3B8', fontSize: 11, fontStyle: 'italic' }}>Sin registros</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Histórico */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ color: '#0F1A2E', fontSize: 14, fontWeight: 700, margin: 0,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Histórico</h2>
        <span style={{ color: '#94A3B8', fontSize: 11 }}>Últimos {saldos.length}</span>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Fecha', 'Banco', 'Empresa', 'Tipo', 'Saldo', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: h === 'Saldo' ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {saldos.map((s, i) => (
              <tr key={s.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : '#F8FAFC',
              }}>
                <td style={{ padding: '10px 16px', color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {formatDate(s.recordedAt)}
                </td>
                <td style={{ padding: '10px 16px', color: '#0F1A2E', fontSize: 13, fontWeight: 600 }}>
                  {BANK_LABELS[s.bank] ?? s.bank}
                </td>
                <td style={{ padding: '10px 16px', color: '#475569', fontSize: 13 }}>{s.company.name}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    background: s.type === 'CONTABLE' ? '#F0FDF4' : '#FEFCE8',
                    color: s.type === 'CONTABLE' ? '#16A34A' : '#CA8A04',
                    borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                  }}>{s.type}</span>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#0F1A2E',
                  fontSize: 14, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {formatCLP(Number(s.balance))}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <DeleteSaldoButton id={s.id} />
                </td>
              </tr>
            ))}
            {saldos.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  Sin saldos bancarios registrados — usa el botón &ldquo;+ Registrar saldo&rdquo; arriba
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
