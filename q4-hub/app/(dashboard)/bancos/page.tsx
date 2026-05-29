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
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>Bancos</h1>
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
                <div style={{ display: 'flex', flexDirection: 'column