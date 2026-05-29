'use client'
import { formatCLP, formatDate } from '@/lib/fmt'
import { T } from '@/lib/theme'

type Pago = {
  id: number
  description: string
  gross: number
  paymentDate: string | null
  costCenter: string | null
  provider: string | null
}

export function PagosProximosWidget({ pagos }: { pagos: Pago[] }) {
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20,
      boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 16 }}>Próximos 7 días</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pagos.length === 0 && (
          <div style={{ color: T.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Sin pagos próximos
          </div>
        )}
        {pagos.map(p => (
          <div key={p.id} style={{
            background: T.cardHover, borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.textPrimary, fontSize: 13, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.description}
                </div>
                <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>
                  {p.costCenter ?? ''}{p.provider ? ` · ${p.provider}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: T.warning, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(p.gross)}
                </div>
                <div style={{ color: T.textMuted, fontSize: 11 }}>{formatDate(p.paymentDate)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
