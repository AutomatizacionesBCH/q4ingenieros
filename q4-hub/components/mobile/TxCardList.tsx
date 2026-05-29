'use client'
import Link from 'next/link'
import { formatCLP, formatDate, bestDate } from '@/lib/fmt'
import { T, STATUS_COLOR } from '@/lib/theme'
import { StatusBadge } from '@/components/transacciones/StatusBadge'

type Tx = {
  id: number
  description: string
  paymentDate: Date | null
  docDueDate: Date | null
  docIssueDate: Date | null
  createdAt: Date
  net?: unknown
  gross: unknown
  status: 'PAGADO' | 'PENDIENTE' | 'NULO'
  movementType: 'INGRESO' | 'EGRESO'
  costCenter: { code: string; name: string } | null
  company: { name: string }
  provider: { name: string } | null
  account?: { code: string } | null
}

export function TxCardList({ items, showType = true }: { items: Tx[]; showType?: boolean }) {
  if (items.length === 0) {
    return (
      <div style={{
        background: T.card, borderRadius: 12,
        border: `1px solid ${T.border}`, padding: '40px 20px', textAlign: 'center',
        color: T.textMuted, fontSize: 14,
      }}>
        Sin transacciones
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(tx => {
        const best = bestDate(tx)
        const isIngreso = tx.movementType === 'INGRESO'
        return (
          <Link key={tx.id} href={`/transacciones/${tx.id}/editar`} style={{
            background: T.card, borderRadius: 14,
            border: `1px solid ${T.border}`,
            padding: '14px 16px',
            textDecoration: 'none', color: T.textPrimary,
            display: 'flex', flexDirection: 'column', gap: 8,
            boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
            position: 'relative',
            borderLeftWidth: 4,
            borderLeftColor: STATUS_COLOR[tx.status].fg,
          }}>
            {/* Fecha + monto */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {best ? formatDate(best.date) : 'Sin fecha'}
                {best && best.kind !== 'pago' && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>({best.kind})</span>
                )}
              </div>
              <div style={{
                color: isIngreso ? T.success : T.textPrimary,
                fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}>
                {isIngreso ? '+' : ''}{formatCLP(Number(tx.gross))}
              </div>
            </div>

            {/* Descripción */}
            <div style={{
              color: T.textPrimary, fontSize: 14, fontWeight: 500, lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {tx.description}
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {tx.costCenter && (
                <span style={{
                  background: T.orangeFaint, color: T.orange,
                  borderRadius: 6, padding: '2px 8px',
                  fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
                }}>{tx.costCenter.code}</span>
              )}
              {tx.provider && (
                <span style={{ color: T.textSec, fontSize: 12,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: '1 1 auto', minWidth: 0,
                }}>{tx.provider.name}</span>
              )}
              <div onClick={e => { e.preventDefault(); e.stopPropagation() }} style={{ marginLeft: 'auto' }}>
                <StatusBadge txId={tx.id} status={tx.status} />
              </div>
            </div>

            {/* Footer info */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: T.textMuted,
              paddingTop: 4,
              borderTop: `1px dashed ${T.border}`,
            }}>
              <span>{tx.company.name.split(' ')[0]}</span>
              {showType && (
                <span style={{
                  color: isIngreso ? T.success : T.danger,
                  fontWeight: 600,
                }}>{tx.movementType}</span>
              )}
              {tx.account && (
                <span style={{ fontFamily: 'monospace' }}>{tx.account.code}</span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
