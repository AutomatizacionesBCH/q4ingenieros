import { T } from '@/lib/theme'
import { formatCLP, formatDate } from '@/lib/fmt'

type Totals = { ingresos: number; egresos: number; resultado: number }

/**
 * Favorable-aware delta pill computed from raw current vs previous values.
 * Handles sign flips explicitly (a resultado going loss→profit is "pasa a positivo",
 * not a meaningless +10000%), and a zero baseline (no division).
 * favorableUp=true → an increase is good (green).
 */
function Pill({ curr, prev, favorableUp }: { curr: number; prev: number; favorableUp: boolean }) {
  const muted = { color: T.textMuted, fontWeight: 400 } as const

  // Sign flip — meaningful mainly for "resultado" (ingresos/egresos are non-negative sums)
  if (prev < 0 && curr >= 0) {
    return <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>▲ pasa a positivo <span style={muted}>vs mes anterior</span></span>
  }
  if (prev >= 0 && curr < 0) {
    return <span style={{ fontSize: 11, color: T.danger, fontWeight: 600 }}>▼ pasa a negativo <span style={muted}>vs mes anterior</span></span>
  }
  if (prev === 0) {
    return <span style={{ fontSize: 11, color: T.textMuted }}>{curr === 0 ? '— sin variación' : 'nuevo · sin base previa'}</span>
  }

  const pct = ((curr - prev) / Math.abs(prev)) * 100
  const up = pct >= 0
  const color = up === favorableUp ? T.success : T.danger
  return (
    <span style={{ fontSize: 11, color, fontWeight: 600 }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% <span style={muted}>vs mes anterior</span>
    </span>
  )
}

const labelStyle: React.CSSProperties = {
  color: T.textMuted, fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
}

function Card({ accent, children }: { accent?: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      background: T.card, borderRadius: 12,
      border: `1px solid ${accent ? T.orangeBorder : T.border}`,
      padding: '16px 20px', boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      {children}
    </div>
  )
}

export function SaldoKpiStrip({
  saldo, saldoFecha, curr, prev,
}: {
  saldo: number
  saldoFecha: string | null
  curr: Totals
  prev: Totals
}) {
  return (
    <div className="q4-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 4 }}>
      {/* Saldo disponible — real-time, liquidity anchor */}
      <Card accent>
        <div style={labelStyle}>Saldo disponible</div>
        <div style={{ color: saldo < 0 ? T.danger : T.textPrimary, fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatCLP(saldo)}
        </div>
        <div style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>
          {saldoFecha ? `tiempo real · al ${formatDate(saldoFecha)}` : 'Sin saldos registrados'}
        </div>
      </Card>

      {/* Ingresos del período */}
      <Card>
        <div style={labelStyle}>Ingresos del período</div>
        <div style={{ color: T.success, fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatCLP(curr.ingresos)}
        </div>
        <div style={{ marginTop: 4 }}><Pill curr={curr.ingresos} prev={prev.ingresos} favorableUp /></div>
      </Card>

      {/* Egresos del período */}
      <Card>
        <div style={labelStyle}>Egresos del período</div>
        <div style={{ color: T.orange, fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatCLP(curr.egresos)}
        </div>
        <div style={{ marginTop: 4 }}><Pill curr={curr.egresos} prev={prev.egresos} favorableUp={false} /></div>
      </Card>

      {/* Resultado del período */}
      <Card>
        <div style={labelStyle}>Resultado del período</div>
        <div style={{ color: curr.resultado >= 0 ? T.success : T.danger, fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatCLP(curr.resultado)}
        </div>
        <div style={{ marginTop: 4 }}><Pill curr={curr.resultado} prev={prev.resultado} favorableUp /></div>
      </Card>
    </div>
  )
}
