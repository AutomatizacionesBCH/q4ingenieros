'use client'

/**
 * components/ControlModule.tsx — Control 2026 (Client Component)
 *
 * Receives parsed data from the server component and renders:
 * 1. Pendiente summary (Público / Privado)
 * 2. Monthly summary table
 * 3. Monthly detail cards — each with 3 boxes + inline edit
 */

import { useState, useEffect, useCallback } from 'react'
import type { ControlData, MonthDetail } from '@/lib/control-parser'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  canvas:     '#F0F2F6',
  card:       '#FFFFFF',
  border:     '#E2E8F0',
  text:       '#0F1A2E',
  textSec:    '#64748B',
  textMuted:  '#94A3B8',
  orange:     '#E5501E',
  orangeLight:'#FFF5F2',
  success:    '#16A34A',
  successBg:  '#F0FDF4',
  warning:    '#CA8A04',
  warningBg:  '#FEFCE8',
  pubBg:      '#EFF6FF',   // blue tint — Público
  privBg:     '#F5F3FF',   // purple tint — Privado
  editBg:     '#FFFBEB',
  navy:       '#0F1A2E',
  listBg:     '#F8FAFC',
} as const

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatCLP(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(v)
}

function parseInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9,.-]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// ─── Edits shape (per-month overrides) ───────────────────────────────────────

interface MonthEdits {
  facturadoTotal?: number | null
  ingresoPrivado?: number | null
  ingresoPublico?: number | null
  ingresoTotal?: number | null
  resumenFacturado?: number | null
  resumenIngresoCaja?: number | null
}

const STORAGE_KEY = 'control_edits_v1'

function loadEdits(): Record<string, MonthEdits> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch { return {} }
}

function saveEdits(edits: Record<string, MonthEdits>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(edits))
}

// ─── Label chip ───────────────────────────────────────────────────────────────

function Chip({ label, value, bg, color }: {
  label: string; value: string; bg: string; color: string
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      background: bg, borderRadius: 8, padding: '10px 14px',
    }}>
      <span style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Pendiente summary ────────────────────────────────────────────────────────

function PendienteSection({ pendiente }: { pendiente: ControlData['pendiente'] }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
    }}>
      {/* Público */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: '18px 20px', borderTop: `3px solid #2563EB`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: '#2563EB', marginBottom: 14,
        }}>
          Público — Pendiente
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Chip label="No Facturado" value={formatCLP(pendiente.publicoNoFacturado)} bg={C.pubBg} color={C.text} />
          <Chip label="Facturado / No Cobrado" value={formatCLP(pendiente.publicoFacturadoNoCobrado)} bg={C.pubBg} color={C.warning} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: '#DBEAFE', borderRadius: 8,
            marginTop: 4,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total pendiente
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1D4ED8', fontVariantNumeric: 'tabular-nums' }}>
              {formatCLP(pendiente.publicoTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Privado */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: '18px 20px', borderTop: `3px solid #7C3AED`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: '#7C3AED', marginBottom: 14,
        }}>
          Privado — Pendiente
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Chip label="No Facturado" value={formatCLP(pendiente.privadoNoFacturado)} bg={C.privBg} color={C.text} />
          <Chip label="Boletas por Cursar" value={formatCLP(pendiente.privadoBoletasPorCursar)} bg={C.privBg} color={C.textSec} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: '#EDE9FE', borderRadius: 8,
            marginTop: 4,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total pendiente
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#6D28D9', fontVariantNumeric: 'tabular-nums' }}>
              {formatCLP(pendiente.privadoTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Summary table ────────────────────────────────────────────────────────────

function SummaryTable({
  summary,
  totals,
}: {
  summary: ControlData['summary']
  totals: ControlData['totals']
}) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '20px 22px', marginBottom: 24,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: C.textMuted, marginBottom: 16,
      }}>
        Resumen Mensual
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['Mes', 'Facturado Real', 'Ingreso Caja'].map(h => (
                <th key={h} style={{
                  padding: '8px 16px 8px 0', textAlign: 'left',
                  color: C.textMuted, fontWeight: 700, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '9px 16px 9px 0', color: C.text, fontWeight: 600 }}>
                  {row.mes}
                </td>
                <td style={{ padding: '9px 16px 9px 0', color: row.facturado ? C.text : C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(row.facturado)}
                </td>
                <td style={{ padding: '9px 0', color: row.ingreso ? C.text : C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(row.ingreso)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${C.border}`, background: C.listBg }}>
              <td style={{ padding: '9px 16px 9px 0', color: C.textSec, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total Q4
              </td>
              <td style={{ padding: '9px 16px 9px 0', color: totals.facturado != null ? C.text : C.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {formatCLP(totals.facturado)}
              </td>
              <td style={{ padding: '9px 0', color: totals.ingreso != null ? C.text : C.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {formatCLP(totals.ingreso)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Edit field ───────────────────────────────────────────────────────────────

function EditField({
  label, value, onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  const [raw, setRaw] = useState(value !== null ? String(value) : '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </label>
      <input
        type="text"
        value={raw}
        onChange={e => {
          setRaw(e.target.value)
          onChange(parseInput(e.target.value))
        }}
        placeholder="0"
        style={{
          border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px',
          fontSize: 13, fontVariantNumeric: 'tabular-nums', color: C.text,
          background: '#FFFBEB', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Month card ───────────────────────────────────────────────────────────────

function MonthCard({
  month,
  edits,
  onSave,
}: {
  month: MonthDetail
  edits: MonthEdits
  onSave: (edits: MonthEdits) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<MonthEdits>({})

  const startEdit = () => {
    setDraft({
      facturadoTotal:    edits.facturadoTotal    ?? month.facturadoTotal,
      ingresoPrivado:    edits.ingresoPrivado    ?? month.ingresoPrivado,
      ingresoPublico:    edits.ingresoPublico    ?? month.ingresoPublico,
      ingresoTotal:      edits.ingresoTotal      ?? month.ingresoTotal,
      resumenFacturado:  edits.resumenFacturado  ?? month.resumenFacturado,
      resumenIngresoCaja:edits.resumenIngresoCaja?? month.resumenIngresoCaja,
    })
    setEditing(true)
  }

  const cancel = () => { setDraft({}); setEditing(false) }

  const save = () => {
    onSave(draft)
    setEditing(false)
  }

  // Merge edits over raw data
  const facturadoTotal     = edits.facturadoTotal     ?? month.facturadoTotal
  const ingresoPrivado     = edits.ingresoPrivado     ?? month.ingresoPrivado
  const ingresoPublico     = edits.ingresoPublico     ?? month.ingresoPublico
  const ingresoTotal       = edits.ingresoTotal       ?? month.ingresoTotal
  const resumenFacturado   = edits.resumenFacturado   ?? month.resumenFacturado
  const resumenIngresoCaja = edits.resumenIngresoCaja ?? month.resumenIngresoCaja

  const hasEdits = Object.keys(edits).length > 0

  const boxStyle: React.CSSProperties = {
    background: C.card,
    border: editing ? `1px solid ${C.orange}` : `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
  }

  const boxTitle = (t: string, accent?: string) => (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: accent ?? C.textSec,
      paddingBottom: 8, borderBottom: `1px solid ${C.border}`,
    }}>
      {t}
    </div>
  )

  const row = (label: string, value: number | null, bold?: boolean, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 11, color: C.textSec }}>{label}</span>
      <span style={{
        fontSize: bold ? 14 : 12, fontWeight: bold ? 700 : 500,
        color: color ?? (value ? C.text : C.textMuted),
        fontVariantNumeric: 'tabular-nums', flexShrink: 0,
      }}>
        {formatCLP(value)}
      </span>
    </div>
  )

  const divider = () => (
    <div style={{ height: 1, background: C.border, margin: '2px 0' }} />
  )

  return (
    <div style={{
      background: C.listBg, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '16px 18px', marginBottom: 16,
    }}>
      {/* Month header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 15, fontWeight: 800, color: C.text,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {month.mes}
          </span>
          {hasEdits && !editing && (
            <span style={{
              fontSize: 9, background: C.orangeLight, color: C.orange,
              border: `1px solid ${C.orange}`, borderRadius: 4,
              padding: '2px 6px', fontWeight: 700, letterSpacing: '0.05em',
            }}>
              EDITADO
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button onClick={cancel} style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 6,
                border: `1px solid ${C.border}`, background: C.card,
                color: C.textSec, cursor: 'pointer', fontWeight: 600,
              }}>
                Cancelar
              </button>
              <button onClick={save} style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 6,
                border: 'none', background: C.orange, color: '#fff',
                cursor: 'pointer', fontWeight: 700,
              }}>
                Guardar
              </button>
            </>
          ) : (
            <button onClick={startEdit} style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 6,
              border: `1px solid ${C.border}`, background: C.card,
              color: C.textSec, cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ fontSize: 12 }}>✏</span> Editar
            </button>
          )}
        </div>
      </div>

      {/* 3 boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr', gap: 10 }}>

        {/* Box 1: Facturado */}
        <div style={boxStyle}>
          {boxTitle('Facturado', '#0284C7')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {month.facturadoItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', gap: 8,
                padding: '3px 0',
                borderBottom: i < month.facturadoItems.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <span style={{ fontSize: 11, color: C.text, flex: 1, minWidth: 0 }}>
                  {item.project}
                </span>
                <span style={{ fontSize: 11, color: C.textSec, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {formatCLP(item.amount)}
                </span>
              </div>
            ))}
          </div>
          {divider()}
          {editing ? (
            <EditField
              label="Total Facturado"
              value={draft.facturadoTotal ?? facturadoTotal}
              onChange={v => setDraft(d => ({ ...d, facturadoTotal: v }))}
            />
          ) : (
            row('Total', facturadoTotal, true, '#0284C7')
          )}
        </div>

        {/* Box 2: Ingreso recibido */}
        <div style={boxStyle}>
          {boxTitle('Ingreso Recibido')}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <EditField
                label="Privado"
                value={draft.ingresoPrivado ?? ingresoPrivado}
                onChange={v => setDraft(d => ({ ...d, ingresoPrivado: v }))}
              />
              <EditField
                label="Público"
                value={draft.ingresoPublico ?? ingresoPublico}
                onChange={v => setDraft(d => ({ ...d, ingresoPublico: v }))}
              />
              {divider()}
              <EditField
                label="Total Ingresos"
                value={draft.ingresoTotal ?? ingresoTotal}
                onChange={v => setDraft(d => ({ ...d, ingresoTotal: v }))}
              />
            </div>
          ) : (
            <>
              <div style={{
                background: C.privBg, borderRadius: 7, padding: '8px 10px',
                display: 'flex', flexDirection: 'column', gap: 3,
              }}>
                <span style={{ fontSize: 9, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
                  Privado
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(ingresoPrivado)}
                </span>
              </div>
              <div style={{
                background: C.pubBg, borderRadius: 7, padding: '8px 10px',
                display: 'flex', flexDirection: 'column', gap: 3,
              }}>
                <span style={{ fontSize: 9, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
                  Público
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCLP(ingresoPublico)}
                </span>
              </div>
              {divider()}
              {row('Total', ingresoTotal, true, C.success)}
            </>
          )}
        </div>

        {/* Box 3: Resumen */}
        <div style={boxStyle}>
          {boxTitle('Resumen', C.orange)}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <EditField
                label="Total Facturado"
                value={draft.resumenFacturado ?? resumenFacturado}
                onChange={v => setDraft(d => ({ ...d, resumenFacturado: v }))}
              />
              <EditField
                label="Total Ingreso (Caja)"
                value={draft.resumenIngresoCaja ?? resumenIngresoCaja}
                onChange={v => setDraft(d => ({ ...d, resumenIngresoCaja: v }))}
              />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Total Facturado
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {formatCLP(resumenFacturado)}
                </span>
              </div>
              {divider()}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Total Ingreso Caja
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.success, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {formatCLP(resumenIngresoCaja)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main module ──────────────────────────────────────────────────────────────

export function ControlModule({ data }: { data: ControlData }) {
  const [allEdits, setAllEdits] = useState<Record<string, MonthEdits>>({})

  // Load from localStorage once on mount
  useEffect(() => {
    setAllEdits(loadEdits())
  }, [])

  const handleSave = useCallback((mes: string, edits: MonthEdits) => {
    setAllEdits(prev => {
      const next = { ...prev, [mes]: edits }
      saveEdits(next)
      return next
    })
  }, [])

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: C.canvas }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>
            Control Ingeniería Q4 2026
          </h1>
          {data.lastUpdate && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMuted }}>
              Última actualización: {data.lastUpdate}
            </p>
          )}
        </div>

        {/* Pendiente summary */}
        <PendienteSection pendiente={data.pendiente} />

        {/* Monthly summary table */}
        {data.summary.length > 0 && (
          <SummaryTable summary={data.summary} totals={data.totals} />
        )}

        {/* Section label */}
        {data.months.length > 0 && (
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: C.textMuted, marginBottom: 12,
          }}>
            Detalle por Mes
          </div>
        )}

        {/* Monthly cards */}
        {data.months.map(month => (
          <MonthCard
            key={month.mes}
            month={month}
            edits={allEdits[month.mes] ?? {}}
            onSave={edits => handleSave(month.mes, edits)}
          />
        ))}

        {/* Empty state */}
        {data.summary.length === 0 && data.months.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>◈</span>
            <p style={{ color: C.textMuted, fontSize: 14 }}>
              No se encontraron datos en el archivo de control.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
