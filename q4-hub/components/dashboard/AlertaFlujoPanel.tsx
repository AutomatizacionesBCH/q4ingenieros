'use client'
import { useState } from 'react'
import { T } from '@/lib/theme'
import { formatCLP, formatDate } from '@/lib/fmt'
import { useUmbral } from './useUmbral'

type Week = { weekLabel: string; weekStartISO: string; running: number }

export function AlertaFlujoPanel({
  projected, saldoActual, unscheduledEgresoCount, saldoRegistrado = true,
}: {
  projected: Week[]
  saldoActual: number
  unscheduledEgresoCount: number
  saldoRegistrado?: boolean
}) {
  const { umbral, setUmbral, mounted } = useUmbral()
  const [draft, setDraft] = useState<string>('')
  const [editing, setEditing] = useState(false)

  const cardStyle: React.CSSProperties = {
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    padding: 20, boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    display: 'flex', flexDirection: 'column', gap: 12, height: '100%',
  }

  if (!mounted) {
    return (
      <div style={cardStyle}>
        <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Alerta de flujo
        </div>
        <div style={{ color: T.textMuted, fontSize: 13 }}>calculando…</div>
      </div>
    )
  }

  // Earliest week whose projected running balance breaches the threshold.
  const breach = projected.find(w => w.running < umbral) ?? null
  const breachCount = projected.filter(w => w.running < umbral).length
  const healthy = breach == null
  // Without registered bank balances the projection starts from $0 — a breach here would be
  // a false alarm (unknown cash, not low cash), so show an informational state instead.
  const noSaldo = !saldoRegistrado

  const save = () => {
    const n = Number(draft.replace(/[^\d.-]/g, ''))
    if (Number.isFinite(n) && n >= 0) setUmbral(n)
    setEditing(false)
    setDraft('')
  }

  return (
    <div style={cardStyle}>
      <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Alerta de flujo proyectado
      </div>

      {/* Status chip */}
      {noSaldo ? (
        <div style={{ background: T.neutralBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ color: T.textPrimary, fontSize: 14, fontWeight: 700 }}>Proyección sin saldo base</div>
          <div style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
            Registra los saldos bancarios en <strong>Bancos</strong> para activar la alerta.
            Por ahora la proyección parte desde $0 y solo muestra los movimientos pendientes.
          </div>
        </div>
      ) : (
        <div style={{
          background: healthy ? T.successBg : T.dangerBg,
          border: `1px solid ${healthy ? T.successBorder : T.dangerBorder}`,
          borderRadius: 10, padding: '12px 14px',
        }}>
          <div style={{ color: healthy ? T.success : T.danger, fontSize: 14, fontWeight: 700 }}>
            {healthy ? '✓ Flujo saludable' : `⚠ Flujo bajo umbral`}
          </div>
          <div style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
            {healthy
              ? `El saldo proyectado se mantiene sobre ${formatCLP(umbral)} en las próximas 8 semanas.`
              : `Cae bajo el umbral en ${breachCount} semana${breachCount === 1 ? '' : 's'}.`}
          </div>
        </div>
      )}

      {/* Earliest breach detail */}
      {!noSaldo && !healthy && breach && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: T.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Primera semana crítica
          </div>
          <div style={{ color: T.textPrimary, fontSize: 13, fontWeight: 600 }}>
            Semana del {formatDate(breach.weekStartISO)}
          </div>
          <div style={{ color: T.danger, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            Saldo proyectado: {formatCLP(breach.running)}
          </div>
          <div style={{ color: T.textSec, fontSize: 12 }}>
            Déficit vs umbral: {formatCLP(umbral - breach.running)}
          </div>
        </div>
      )}

      {/* Threshold config */}
      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.textMuted, fontSize: 11, fontWeight: 600 }}>Umbral configurado</span>
          {!editing && (
            <button onClick={() => { setEditing(true); setDraft(String(umbral)) }} style={{
              background: 'transparent', border: 'none', color: T.orange, fontSize: 12,
              fontWeight: 600, cursor: 'pointer', padding: 0,
            }}>Editar</button>
          )}
        </div>
        {editing ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              type="number" value={draft} onChange={e => setDraft(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft('') } }}
              style={{
                flex: 1, background: T.field, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '6px 10px', fontSize: 13, color: T.textPrimary, outline: 'none', minWidth: 0,
              }}
            />
            <button onClick={save} style={{
              background: T.orange, color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Guardar</button>
          </div>
        ) : (
          <div style={{ color: T.textPrimary, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
            {formatCLP(umbral)}
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ color: T.textMuted, fontSize: 10, lineHeight: 1.5 }}>
        La proyección usa montos PENDIENTE brutos y mira hacia adelante desde hoy;
        ignora los filtros de mes y estado.
        {unscheduledEgresoCount > 0 && (
          <span style={{ color: T.warning }}>
            {' '}Hay {unscheduledEgresoCount} egreso{unscheduledEgresoCount === 1 ? '' : 's'} pendiente{unscheduledEgresoCount === 1 ? '' : 's'} sin fecha de pago (no incluido{unscheduledEgresoCount === 1 ? '' : 's'} en la proyección).
          </span>
        )}
      </div>
    </div>
  )
}
