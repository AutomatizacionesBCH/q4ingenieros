'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { ProjectListItem } from '@/types/ui'
import type { ProjectDetail, EP } from '@/types/project'
import { useIsMobile } from '@/hooks/useIsMobile'

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  canvas:        '#F0F2F6',
  card:          '#FFFFFF',
  border:        '#E2E8F0',
  textPrimary:   '#0F1A2E',
  textSec:       '#64748B',
  textMuted:     '#94A3B8',
  orange:        '#E5501E',
  orangeFaint:   'rgba(229, 80, 30, 0.06)',
  orangeBorder:  'rgba(229, 80, 30, 0.22)',
  success:       '#16A34A',
  successBg:     '#F0FDF4',
  successBorder: '#BBF7D0',
  warning:       '#CA8A04',
  warningBg:     '#FEFCE8',
  warningBorder: '#FDE68A',
  danger:        '#DC2626',
  dangerBg:      '#FEF2F2',
  dangerBorder:  '#FECACA',
  listBg:        '#F8FAFC',
  heroBg:        '#FAFBFD',
} as const

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCLP(v: number | null | undefined): string {
  if (v == null) return '—'
  return '$ ' + Math.round(v).toLocaleString('es-CL')
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const s = typeof d === 'string' ? d : (d as Date).toISOString()
  const [y, m, day] = s.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getDotColor(status: string, isFinalized: boolean): string {
  if (isFinalized) return C.success
  const s = status.toLowerCase()
  if (s.includes('revisión') || s.includes('subsanacion')) return C.warning
  if (s.includes('proceso') || s.includes('diseño')) return C.orange
  return C.textMuted
}

function gestionLabel(g: string | null | undefined): string {
  if (g === 'm') return 'Memoria'
  if (g === 'i') return 'Ingeniería'
  if (g === 'e') return 'Especialidades'
  return g ?? '—'
}

// ─── Project Dropdown ─────────────────────────────────────────────────────────

function ProjectDropdown({
  projects,
  selectedId,
  onSelect,
}: {
  projects: ProjectListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const [open, setOpen]   = useState(false)
  const [q, setQ]         = useState('')
  const wrapRef           = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setQ('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20)
  }, [open])

  const selected = projects.find(p => p.id === selectedId) ?? null

  const shown = useMemo(() => {
    if (!q.trim()) return projects
    const lq = q.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(lq) ||
      p.client.toLowerCase().includes(lq) ||
      String(p.id).includes(lq),
    )
  }, [projects, q])

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 0, width: '100%' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '0 12px', height: 38,
          border: `1px solid ${open ? C.orange : C.border}`,
          borderRadius: 8, background: C.card, cursor: 'pointer',
          color: selected ? C.textPrimary : C.textMuted,
          fontSize: 13, transition: 'border-color 0.1s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected
            ? `#${selected.id} — ${selected.name}`
            : `Seleccionar proyecto... (${projects.length} disponibles)`}
        </span>
        <span style={{
          flexShrink: 0, color: C.textMuted, fontSize: 10,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
          zIndex: 500, maxHeight: 420,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <input
              ref={inputRef} value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nombre, cliente o número..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6,
                fontSize: 12, color: C.textPrimary, background: C.listBg, outline: 'none',
              }}
            />
          </div>
          <div style={{
            padding: '5px 12px 4px', flexShrink: 0,
            borderBottom: `1px solid ${C.border}`, background: C.listBg,
          }}>
            <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {shown.length} proyecto{shown.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {shown.length === 0 ? (
              <div style={{ padding: '20px 12px', color: C.textMuted, fontSize: 13, textAlign: 'center' }}>
                Sin resultados
              </div>
            ) : shown.map(p => {
              const isSel = p.id === selectedId
              const dot   = getDotColor(p.status ?? '', p.isFinalized)
              return (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p.id); setOpen(false); setQ('') }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    background: isSel ? C.orangeFaint : 'transparent',
                    borderTop: 'none', borderRight: 'none', borderLeft: 'none',
                    borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', background: dot,
                    flexShrink: 0, marginTop: 4,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.textMuted, flexShrink: 0 }}>
                        #{p.id}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: C.textPrimary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {p.name}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: C.textSec, marginTop: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.client}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Table styles ─────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '9px 14px', textAlign: 'left',
  fontSize: 10, fontWeight: 700, color: '#94A3B8',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}
const TD: React.CSSProperties = {
  padding: '9px 14px', fontSize: 13, color: '#0F1A2E',
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 14,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: C.textMuted,
      }}>
        {children}
      </div>
      {aside && <div>{aside}</div>}
    </div>
  )
}

// ─── Editable KPI (used in budget breakdown row) ──────────────────────────────

interface ProjEdits {
  budget?:        number
  gross?:         number
  retentionPct?:  number
  retentionTipo?: 'boleta' | 'factura'
  egresos?:       number
  eps?:          Record<number, { label?: string; amount?: number; paid?: boolean }>
  expenses?:     Record<number, { description?: string; amountNet?: number; tipo?: 'boleta' | 'factura'; paid?: boolean }>
  observations?: string
}
async function loadProjEdits(id: number): Promise<ProjEdits> {
  try {
    const res = await fetch(`/api/edits/${id}`)
    if (res.ok) return await res.json()
  } catch {}
  return {}
}
async function saveProjEdits(id: number, edits: ProjEdits) {
  try {
    await fetch(`/api/edits/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edits),
    })
  } catch {}
}
type EditField = 'budget' | 'egresos' | 'gross'

// Compact budget card used in the breakdown row
function BudgetCard({
  label, value, color, isEditing, isOverridden, inputVal,
  onStartEdit, onInputChange, onCommit, onCancel, onReset,
}: {
  label: string; value: number | null; color?: string
  isEditing: boolean; isOverridden: boolean; inputVal: string
  onStartEdit: (v: number | null) => void
  onInputChange: (v: string) => void
  onCommit: () => void; onCancel: () => void; onReset: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  const fg = color ?? C.textPrimary

  return (
    <div
      onClick={() => { if (!isEditing) onStartEdit(value) }}
      style={{
        background: isEditing ? '#FFFBF0' : C.card,
        border: `1.5px solid ${isEditing ? C.orange : C.border}`,
        borderRadius: 10, padding: '14px 16px',
        cursor: 'pointer', transition: 'border-color 0.1s',
        flex: 1,
      }}
    >
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase', color: C.textMuted, marginBottom: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>{label}</span>
        {isOverridden && (
          <span
            onClick={e => { e.stopPropagation(); onReset() }}
            title="Restaurar valor original"
            style={{ cursor: 'pointer', color: C.orange, fontSize: 13 }}
          >↺</span>
        )}
      </div>
      {isEditing ? (
        <input
          ref={inputRef} autoFocus value={inputVal}
          onChange={e => onInputChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 16, fontWeight: 700, color: fg,
            fontVariantNumeric: 'tabular-nums',
            border: 'none', outline: 'none', background: 'transparent',
            padding: 0, lineHeight: 1,
          }}
        />
      ) : (
        <>
          <div style={{ fontSize: 16, fontWeight: 700, color: fg, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {fmtCLP(value)}
          </div>
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 5, opacity: 0.5 }}>✎ editar</div>
        </>
      )}
    </div>
  )
}

// ─── Active edit types ────────────────────────────────────────────────────────

type ActiveEdit =
  | { kind: 'kpi';       field: EditField }
  | { kind: 'retention' }
  | { kind: 'ep';        idx: number; col: 'label' | 'amount' }
  | { kind: 'expense';   idx: number; col: 'description' | 'amountNet' }
  | { kind: 'obs' }
  | null

function EditableCell({
  value, isEditing, inputVal, onStart, onChange, onCommit, onCancel,
  align = 'left', color,
}: {
  value: string; isEditing: boolean; inputVal: string
  onStart: () => void; onChange: (v: string) => void
  onCommit: () => void; onCancel: () => void
  align?: 'left' | 'right'; color?: string
}) {
  return (
    <td
      onClick={() => { if (!isEditing) onStart() }}
      style={{ ...TD, textAlign: align, cursor: 'pointer', color: color ?? C.textPrimary }}
    >
      {isEditing ? (
        <input
          autoFocus value={inputVal}
          onChange={e => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1.5px solid ${C.orange}`, borderRadius: 5,
            padding: '4px 7px', fontSize: 13, outline: 'none',
            background: '#FFFBF0', color: C.textPrimary,
          }}
        />
      ) : (
        <span style={{
          display: 'flex', alignItems: 'center', minHeight: 20, gap: 5,
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        }}>
          {align === 'right' && <span style={{ fontSize: 9, color: C.textMuted, opacity: 0.4 }}>✎</span>}
          <span>{value || '—'}</span>
          {align !== 'right' && <span style={{ fontSize: 9, color: C.textMuted, opacity: 0.4 }}>✎</span>}
        </span>
      )}
    </td>
  )
}

// ─── Hero metric (large, inline-editable) ────────────────────────────────────

function HeroMetric({
  label, value, hint, color, editable, isEditing, isOverridden, inputVal,
  onStartEdit, onInputChange, onCommit, onCancel, onReset,
  borderRight,
}: {
  label: string; value: number | null; hint: string; color: string
  editable: boolean; isEditing: boolean; isOverridden: boolean; inputVal: string
  onStartEdit: () => void; onInputChange: (v: string) => void
  onCommit: () => void; onCancel: () => void; onReset: () => void
  borderRight?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  return (
    <div
      onClick={() => { if (editable && !isEditing) onStartEdit() }}
      style={{
        padding: '18px 20px',
        borderRight: borderRight ? `1px solid ${C.border}` : 'none',
        cursor: editable ? 'pointer' : 'default',
        background: isEditing ? '#FFFBF0' : 'transparent',
        transition: 'background 0.12s',
        minWidth: 0,
      }}
      onMouseEnter={e => { if (editable && !isEditing) (e.currentTarget as HTMLElement).style.background = '#F4F6F9' }}
      onMouseLeave={e => { if (!isEditing) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase', color: C.textMuted, marginBottom: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>{label}</span>
        {isOverridden && (
          <span
            onClick={e => { e.stopPropagation(); onReset() }}
            title="Restaurar valor original"
            style={{ cursor: 'pointer', color: C.orange, fontSize: 13, lineHeight: 1 }}
          >↺</span>
        )}
      </div>
      {isEditing ? (
        <input
          ref={inputRef} autoFocus value={inputVal}
          onChange={e => onInputChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 22, fontWeight: 800, color,
            fontVariantNumeric: 'tabular-nums',
            border: 'none', outline: 'none', background: 'transparent',
            padding: 0, lineHeight: 1,
          }}
        />
      ) : (
        <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {fmtCLP(value)}
        </div>
      )}
      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 6, opacity: 0.6 }}>
        {editable ? (isOverridden ? '✎ editado' : '✎ editar') : hint}
      </div>
    </div>
  )
}

// ─── Retention KPI card ───────────────────────────────────────────────────────

function RetentionCard({
  pct, amount, tipo, isEditing, inputVal, isOverridden,
  onStartEdit, onInputChange, onCommit, onCancel, onReset, onSetTipo,
}: {
  pct: number | null; amount: number | null; tipo: 'boleta' | 'factura' | null
  isEditing: boolean; inputVal: string; isOverridden: boolean
  onStartEdit: () => void; onInputChange: (v: string) => void
  onCommit: () => void; onCancel: () => void; onReset: () => void
  onSetTipo: (t: 'boleta' | 'factura' | null) => void
}) {
  return (
    <div style={{
      background: isEditing ? '#FFFBF0' : C.card,
      border: `1.5px solid ${isEditing ? C.orange : C.border}`,
      borderRadius: 10, padding: '14px 16px', flex: 1,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase', color: C.textMuted, marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>Retención SII</span>
        {isOverridden && (
          <span onClick={onReset} title="Restaurar"
            style={{ cursor: 'pointer', color: C.orange, fontSize: 13 }}>↺</span>
        )}
      </div>
      <div style={{ display: 'inline-flex', borderRadius: 20, overflow: 'hidden', border: `1px solid ${C.border}`, marginBottom: 10 }}>
        {(['boleta', 'factura'] as const).map(t => (
          <button key={t} onClick={() => onSetTipo(tipo === t ? null : t)} style={{
            padding: '3px 11px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
            border: 'none', outline: 'none',
            color: tipo === t ? '#fff' : C.textMuted,
            background: tipo === t ? (t === 'factura' ? '#1C2D5A' : C.textSec) : 'transparent',
            transition: 'all 0.12s',
          }}>
            {t === 'factura' ? 'Factura' : 'Boleta'}
          </button>
        ))}
      </div>
      {isEditing ? (
        <div>
          <input
            autoFocus value={inputVal}
            onChange={e => onInputChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
            placeholder="ej: 15.25"
            style={{
              width: '100%', boxSizing: 'border-box',
              fontSize: 16, fontWeight: 700, color: C.textMuted,
              border: 'none', outline: 'none', background: 'transparent',
              padding: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}
          />
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 4, opacity: 0.6 }}>Ingresa el porcentaje (sin %)</div>
        </div>
      ) : (
        <div onClick={onStartEdit} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.textMuted, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {pct != null ? `${pct.toFixed(2)}%` : '—'}
          </div>
          {amount != null && (
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {fmtCLP(amount)}
            </div>
          )}
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3, opacity: 0.5 }}>✎ editar</div>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[240, 180, 120, 200, 150, 180].map((w, i) => (
        <div key={i} style={{
          height: 14, width: w, maxWidth: '100%',
          borderRadius: 4, background: C.border, opacity: 0.7,
        }} />
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDetail({ total }: { total: number }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8, color: C.textMuted, padding: 60, textAlign: 'center',
    }}>
      <span style={{ fontSize: 40, opacity: 0.15 }}>⬡</span>
      <span style={{ fontSize: 14 }}>Selecciona un proyecto del desplegable</span>
      <span style={{ fontSize: 12, opacity: 0.7 }}>
        {total} proyecto{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  detail,
  currentStatus,
  onStatusChange,
}: {
  detail: ProjectDetail
  currentStatus: 'active' | 'finalized'
  onStatusChange: (s: 'active' | 'finalized') => void
}) {
  const [edits,    setEdits]    = useState<ProjEdits>({})
  const [active,   setActive]   = useState<ActiveEdit>(null)
  const [inputVal, setInputVal] = useState('')
  const [budgetOpen, setBudgetOpen] = useState(false)

  useEffect(() => {
    let stale = false
    setActive(null)
    setEdits({})
    loadProjEdits(detail.id).then(loaded => {
      if (!stale) setEdits(prev => ({ ...loaded, ...prev }))
    })
    return () => { stale = true }
  }, [detail.id])

  // Sum uses edited amountNet when present
  const totalEgresosCalc = detail.expenses
    .filter(e => !e.isSection)
    .reduce((s, e, i) => {
      const ov = edits.expenses?.[i] ?? {}
      return s + (ov.amountNet ?? e.amountNet ?? 0)
    }, 0)

  function persist(next: ProjEdits) { setEdits(next); saveProjEdits(detail.id, next) }
  function startEdit(ae: NonNullable<ActiveEdit>, initVal: string) { setActive(ae); setInputVal(initVal) }

  const isAct = (ae: NonNullable<ActiveEdit>): boolean => {
    if (!active) return false
    if (ae.kind === 'kpi')       return active.kind === 'kpi'       && active.field === ae.field
    if (ae.kind === 'retention') return active.kind === 'retention'
    if (ae.kind === 'ep')        return active.kind === 'ep'        && active.idx === ae.idx && active.col === ae.col
    if (ae.kind === 'expense')   return active.kind === 'expense'   && active.idx === ae.idx && active.col === ae.col
    return active.kind === 'obs'
  }

  const ec = (ae: NonNullable<ActiveEdit>, initVal: string) => ({
    isEditing: isAct(ae), inputVal: isAct(ae) ? inputVal : '',
    onStart: () => startEdit(ae, initVal), onChange: setInputVal,
    onCommit: commitEdit, onCancel: () => setActive(null),
  })

  function commitEdit() {
    if (!active) return
    const toNum = (s: string) => Number(s.replace(/[^0-9]/g, ''))

    if (active.kind === 'retention') {
      const pct = parseFloat(inputVal.replace(',', '.').replace(/[^0-9.]/g, ''))
      if (!isNaN(pct) && pct >= 0 && pct <= 100) persist({ ...edits, retentionPct: pct })

    } else if (active.kind === 'kpi') {
      const n = Number(inputVal.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''))
      if (!isNaN(n)) persist({ ...edits, [active.field]: n })

    } else if (active.kind === 'ep') {
      const epEdits = { ...(edits.eps ?? {}) }
      const cur = { ...(epEdits[active.idx] ?? {}) }
      if (active.col === 'amount') { const n = toNum(inputVal); if (!isNaN(n)) cur.amount = n }
      else                         { cur.label = inputVal || undefined }
      epEdits[active.idx] = cur
      persist({ ...edits, eps: epEdits })

    } else if (active.kind === 'expense') {
      const expEdits = { ...(edits.expenses ?? {}) }
      const cur = { ...(expEdits[active.idx] ?? {}) }
      if      (active.col === 'description') { cur.description  = inputVal || undefined }
      else if (active.col === 'amountNet')   { const n = toNum(inputVal); if (!isNaN(n)) cur.amountNet = n }
      expEdits[active.idx] = cur
      persist({ ...edits, expenses: expEdits })

    } else if (active.kind === 'obs') {
      persist({ ...edits, observations: inputVal })
    }
    setActive(null)
  }

  function resetField(field: EditField) { const next = { ...edits }; delete next[field]; persist(next) }
  function resetRetention() {
    const next = { ...edits }
    delete next.retentionPct; delete next.retentionTipo; persist(next)
  }
  function setRetentionTipo(tipo: 'boleta' | 'factura' | null) {
    const next = { ...edits }
    if (tipo == null) delete next.retentionTipo
    else next.retentionTipo = tipo
    persist(next)
  }

  function isEpPaid(ep: EP, idx: number): boolean {
    const ov = edits.eps?.[idx]
    if (ov?.paid !== undefined) return ov.paid
    return !!ep.realDate
  }
  function toggleEpPaid(idx: number) {
    const cur = isEpPaid(detail.eps[idx], idx)
    const epEdits = { ...(edits.eps ?? {}) }
    epEdits[idx] = { ...(epEdits[idx] ?? {}), paid: !cur }
    persist({ ...edits, eps: epEdits })
  }
  function setExpTipo(idx: number, tipo: 'boleta' | 'factura' | null) {
    const expEdits = { ...(edits.expenses ?? {}) }
    const cur = { ...(expEdits[idx] ?? {}) }
    if (tipo == null) { delete cur.tipo } else { cur.tipo = tipo }
    expEdits[idx] = cur
    persist({ ...edits, expenses: expEdits })
  }
  function getEp(ep: EP, idx: number) {
    const ov = edits.eps?.[idx] ?? {}
    return { label: ov.label ?? ep.label ?? `EP ${idx + 1}`, amount: ov.amount ?? ep.amount ?? null }
  }

  const pagadoCalc    = detail.eps.reduce((s, ep, i) =>  isEpPaid(ep, i) ? s + (getEp(ep, i).amount ?? 0) : s, 0)
  const pendienteCalc = detail.eps.reduce((s, ep, i) => !isEpPaid(ep, i) ? s + (getEp(ep, i).amount ?? 0) : s, 0)

  const grossVal = edits.gross ?? detail.budget?.gross ?? null

  const baseRetPct   = detail.budget?.gross && detail.budget?.retention
    ? (detail.budget.retention / detail.budget.gross) * 100
    : null
  const retentionPct  = edits.retentionPct ?? baseRetPct
  const retentionTipo = edits.retentionTipo ?? null
  const retentionVal  = grossVal != null && retentionPct != null
    ? Math.round(grossVal * retentionPct / 100)
    : (detail.budget?.retention ?? null)

  const budget = edits.budget ??
    (grossVal != null && retentionVal != null ? grossVal - retentionVal : null) ??
    detail.budget?.net ?? null

  const egresos = edits.egresos ?? (totalEgresosCalc || null)

  const observations = edits.observations !== undefined ? edits.observations : (detail.observations ?? '')

  const neto       = budget != null && egresos != null ? budget - egresos : null
  const marginCalc = budget != null && budget > 0 && neto != null ? neto / budget : null
  const costoVenta = budget != null && budget > 0 && egresos != null ? egresos / budget : null

  const totalWithTax = detail.expenses.reduce((sum, e, i) => {
    if (e.isSection) return sum
    const ov   = edits.expenses?.[i] ?? {}
    const net  = ov.amountNet ?? e.amountNet ?? null
    const tipo = ov.tipo ?? null
    if (net != null && tipo != null) {
      return sum + Math.round(net * (tipo === 'factura' ? 1.19 : 1.153))
    }
    return sum
  }, 0)
  const hasExpTipos = detail.expenses.some((e, i) => !e.isSection && (edits.expenses?.[i]?.tipo) != null)

  const paidCount = detail.eps.filter((ep, i) => isEpPaid(ep, i)).length
  const totalEps  = detail.eps.length

  // Margin color
  const marginColor = marginCalc == null
    ? C.textMuted
    : marginCalc >= 0.3 ? C.success
    : marginCalc >= 0.1 ? C.warning
    : C.danger

  return (
    <div style={{ maxWidth: 960 }}>

      {/* ── Project header ───────────────────────────────────────────────── */}
      <div style={{
        padding: '22px 28px 18px',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>

          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                color: C.textMuted, letterSpacing: '0.06em',
              }}>
                #{detail.id}
              </span>
              {detail.scope && (
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '2px 9px', borderRadius: 20,
                  background: detail.scope === 'Público' ? '#EFF6FF' : '#F0FDF4',
                  color: detail.scope === 'Público' ? '#1D4ED8' : C.success,
                  border: `1px solid ${detail.scope === 'Público' ? '#BFDBFE' : C.successBorder}`,
                }}>
                  {detail.scope}
                </span>
              )}
              {detail.managementType && (
                <span style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '2px 9px', borderRadius: 20,
                  background: C.listBg, color: C.textSec, border: `1px solid ${C.border}`,
                }}>
                  {gestionLabel(detail.managementType)}
                </span>
              )}
            </div>

            {/* Name */}
            <h2 style={{ margin: '0 0 6px', fontSize: 21, fontWeight: 700, color: C.textPrimary, lineHeight: 1.25 }}>
              {detail.name}
            </h2>

            {/* Client */}
            <div style={{ fontSize: 14, color: C.textSec }}>{detail.client}</div>
          </div>

          {/* Status toggle */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 2 }}>
            {(['active', 'finalized'] as const).map(s => {
              const isOn  = currentStatus === s
              const color = s === 'active' ? C.orange : C.success
              return (
                <button key={s} onClick={() => onStatusChange(s)} style={{
                  padding: '5px 13px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${isOn ? color : C.border}`,
                  background: isOn ? color : 'transparent',
                  color: isOn ? '#fff' : C.textMuted,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {s === 'active' ? 'Activo' : 'Finalizado'}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Financial hero ────────────────────────────────────────────────── */}
      <div style={{ background: C.heroBg, borderBottom: `1px solid ${C.border}` }}>

        {/* 4 main metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {/* Líquido — editable */}
          <HeroMetric
            label="Presupuesto líquido"
            value={budget}
            hint="∑ bruto − retención"
            color={C.textPrimary}
            editable
            isEditing={active?.kind === 'kpi' && active.field === 'budget'}
            isOverridden={edits.budget != null}
            inputVal={active?.kind === 'kpi' && active.field === 'budget' ? inputVal : ''}
            onStartEdit={() => startEdit({ kind: 'kpi', field: 'budget' }, budget != null ? String(Math.round(budget)) : '')}
            onInputChange={setInputVal}
            onCommit={commitEdit}
            onCancel={() => setActive(null)}
            onReset={() => resetField('budget')}
            borderRight
          />
          {/* Cobrado */}
          <HeroMetric
            label="Cobrado"
            value={pagadoCalc}
            hint={`${paidCount}/${totalEps} EPs pagados`}
            color={pagadoCalc > 0 ? C.success : C.textMuted}
            editable={false}
            isEditing={false}
            isOverridden={false}
            inputVal=""
            onStartEdit={() => {}}
            onInputChange={() => {}}
            onCommit={() => {}}
            onCancel={() => {}}
            onReset={() => {}}
            borderRight
          />
          {/* Egresos — editable */}
          <HeroMetric
            label="Egresos"
            value={egresos}
            hint="∑ gastos del proyecto"
            color={egresos != null && egresos > 0 ? C.danger : C.textMuted}
            editable
            isEditing={active?.kind === 'kpi' && active.field === 'egresos'}
            isOverridden={edits.egresos != null}
            inputVal={active?.kind === 'kpi' && active.field === 'egresos' ? inputVal : ''}
            onStartEdit={() => startEdit({ kind: 'kpi', field: 'egresos' }, egresos != null ? String(Math.round(egresos)) : '')}
            onInputChange={setInputVal}
            onCommit={commitEdit}
            onCancel={() => setActive(null)}
            onReset={() => resetField('egresos')}
            borderRight
          />
          {/* Neto */}
          <HeroMetric
            label="Neto Q4"
            value={neto}
            hint="presupuesto − egresos"
            color={neto == null ? C.textMuted : neto >= 0 ? C.success : C.danger}
            editable={false}
            isEditing={false}
            isOverridden={false}
            inputVal=""
            onStartEdit={() => {}}
            onInputChange={() => {}}
            onCommit={() => {}}
            onCancel={() => {}}
            onReset={() => {}}
          />
        </div>

        {/* Margin bar + stats */}
        <div style={{
          padding: '10px 20px 14px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: C.textMuted, flexShrink: 0, width: 52,
          }}>
            Margen
          </span>
          <div style={{ flex: 1, height: 7, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.max(0, Math.min(100, (marginCalc ?? 0) * 100))}%`,
              height: '100%',
              background: marginColor,
              borderRadius: 4,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: marginColor, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {marginCalc != null ? `${(marginCalc * 100).toFixed(1)}%` : '—'}
          </span>
          {costoVenta != null && (
            <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>
              Costo-venta {(costoVenta * 100).toFixed(1)}%
            </span>
          )}
          {pendienteCalc > 0 && (
            <span style={{
              fontSize: 11, color: C.orange, fontWeight: 600, flexShrink: 0,
              padding: '2px 10px', borderRadius: 20,
              background: C.orangeFaint, border: `1px solid ${C.orangeBorder}`,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtCLP(pendienteCalc)} pendiente
            </span>
          )}
        </div>
      </div>

      {/* ── Budget breakdown (collapsible) ───────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${C.border}` }}>
        <button
          onClick={() => setBudgetOpen(o => !o)}
          style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 28px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.textMuted,
          }}
        >
          <span style={{
            fontSize: 9, transition: 'transform 0.18s',
            display: 'inline-block',
            transform: budgetOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>▶</span>
          Desglose presupuesto
          {!budgetOpen && grossVal != null && (
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4, color: C.textSec, fontSize: 11 }}>
              — Bruto {fmtCLP(grossVal)}
              {retentionPct != null && <> · Ret. {retentionPct.toFixed(1)}%</>}
              {retentionTipo && <> ({retentionTipo})</>}
            </span>
          )}
        </button>
        {budgetOpen && (
          <div style={{ padding: '4px 28px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BudgetCard
                label="Bruto"
                value={grossVal}
                isEditing={active?.kind === 'kpi' && active.field === 'gross'}
                isOverridden={edits.gross != null}
                inputVal={active?.kind === 'kpi' && active.field === 'gross' ? inputVal : ''}
                onStartEdit={v => startEdit({ kind: 'kpi', field: 'gross' }, v != null ? String(Math.round(v)) : '')}
                onInputChange={setInputVal}
                onCommit={commitEdit}
                onCancel={() => setActive(null)}
                onReset={() => resetField('gross')}
              />
              <span style={{ color: C.textMuted, fontSize: 18, fontWeight: 300, flexShrink: 0 }}>−</span>
              <RetentionCard
                pct={retentionPct}
                amount={retentionVal}
                tipo={retentionTipo}
                isEditing={active?.kind === 'retention'}
                inputVal={active?.kind === 'retention' ? inputVal : ''}
                isOverridden={edits.retentionPct != null || edits.retentionTipo != null}
                onStartEdit={() => startEdit({ kind: 'retention' }, retentionPct != null ? String(retentionPct) : '')}
                onInputChange={setInputVal}
                onCommit={commitEdit}
                onCancel={() => setActive(null)}
                onReset={resetRetention}
                onSetTipo={setRetentionTipo}
              />
              <span style={{ color: C.textMuted, fontSize: 18, fontWeight: 300, flexShrink: 0 }}>=</span>
              <BudgetCard
                label="Líquido"
                value={budget}
                isEditing={active?.kind === 'kpi' && active.field === 'budget'}
                isOverridden={edits.budget != null}
                inputVal={active?.kind === 'kpi' && active.field === 'budget' ? inputVal : ''}
                onStartEdit={v => startEdit({ kind: 'kpi', field: 'budget' }, v != null ? String(Math.round(v)) : '')}
                onInputChange={setInputVal}
                onCommit={commitEdit}
                onCancel={() => setActive(null)}
                onReset={() => resetField('budget')}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Content sections ─────────────────────────────────────────────── */}
      <div style={{ padding: '26px 28px 44px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* EPs */}
        <div>
          <SectionTitle
            aside={
              totalEps > 0 ? (
                <span style={{
                  fontSize: 11, color: paidCount === totalEps ? C.success : C.orange,
                  fontWeight: 600,
                }}>
                  {paidCount}/{totalEps} pagado{paidCount !== 1 ? 's' : ''}
                </span>
              ) : undefined
            }
          >
            Estados de Pago
            {totalEps > 0 && (
              <span style={{ marginLeft: 6, color: C.textSec, fontWeight: 400 }}>
                ({totalEps})
              </span>
            )}
          </SectionTitle>

          {detail.eps.length === 0 ? (
            <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Sin estados de pago registrados.</p>
          ) : (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.listBg }}>
                    <th style={TH}>Estado de Pago</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Monto</th>
                    <th style={{ ...TH, textAlign: 'center', width: 130 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.eps.map((ep, i) => {
                    const d    = getEp(ep, i)
                    const paid = isEpPaid(ep, i)
                    return (
                      <tr key={i} style={{
                        borderTop: `1px solid ${C.border}`,
                        background: paid ? C.successBg : 'transparent',
                      }}>
                        <EditableCell value={d.label} color={C.textPrimary}
                          {...ec({ kind: 'ep', idx: i, col: 'label'  }, d.label)} />
                        <EditableCell value={d.amount != null ? fmtCLP(d.amount) : ''} align="right" color={C.textPrimary}
                          {...ec({ kind: 'ep', idx: i, col: 'amount' }, d.amount != null ? String(Math.round(d.amount)) : '')} />
                        <td style={{ ...TD, textAlign: 'center' }}>
                          <button
                            onClick={() => toggleEpPaid(i)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                              fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                              color: paid ? C.success : C.orange,
                              background: paid ? 'rgba(22,163,74,0.1)' : C.orangeFaint,
                              border: `1px solid ${paid ? C.successBorder : C.orangeBorder}`,
                            }}
                          >
                            {paid ? '✓ Pagado' : '● Pendiente'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {totalEps > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: `2px solid ${C.border}`, background: C.listBg }}>
                      <td style={{ ...TD, fontWeight: 700, color: C.textSec }}>Total</td>
                      <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: C.success, fontWeight: 600, marginRight: 8 }}>
                          {fmtCLP(pagadoCalc)}
                        </span>
                        {pendienteCalc > 0 && (
                          <span style={{ color: C.orange, fontWeight: 600, fontSize: 12 }}>
                            + {fmtCLP(pendienteCalc)} pend.
                          </span>
                        )}
                      </td>
                      <td style={TD} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* Egresos */}
        {detail.expenses.length > 0 && (
          <div>
            <SectionTitle
              aside={
                <span style={{
                  fontSize: 12, color: C.danger, fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtCLP(totalEgresosCalc)}
                </span>
              }
            >
              Egresos
              <span style={{ marginLeft: 6, color: C.textSec, fontWeight: 400 }}>
                ({detail.expenses.filter(e => !e.isSection).length})
              </span>
            </SectionTitle>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.listBg }}>
                    <th style={TH}>Descripción</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Monto Neto</th>
                    <th style={{ ...TH, textAlign: 'center', width: 150 }}>Tipo</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Con Impuesto</th>
                    <th style={{ ...TH, textAlign: 'center', width: 110 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.expenses.map((e, i) => {
                    if (e.isSection) {
                      return (
                        <tr key={i} style={{
                          background: '#F1F4F8',
                          borderTop: `1px solid ${C.border}`,
                        }}>
                          <td
                            colSpan={e.amountNet !== null ? 1 : 5}
                            style={{
                              ...TD, fontWeight: 700, fontSize: 11,
                              color: C.textSec, letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {e.description}
                          </td>
                          {e.amountNet !== null && (
                            <>
                              <td style={{
                                ...TD, textAlign: 'right', fontWeight: 700,
                                color: C.textSec, fontVariantNumeric: 'tabular-nums',
                              }}>
                                {fmtCLP(e.amountNet)}
                              </td>
                              <td style={TD} /><td style={TD} /><td style={TD} />
                            </>
                          )}
                        </tr>
                      )
                    }

                    const ov   = edits.expenses?.[i] ?? {}
                    const desc = ov.description ?? e.description ?? ''
                    const net  = ov.amountNet   ?? e.amountNet   ?? null
                    const tipo = ov.tipo ?? null
                    const withTax = net != null && tipo != null
                      ? Math.round(net * (tipo === 'factura' ? 1.19 : 1.153))
                      : null
                    const isPaid = ov.paid === true

                    return (
                      <tr key={i} style={{
                        borderTop: `1px solid ${C.border}`,
                        background: isPaid ? C.successBg : 'transparent',
                      }}>
                        <EditableCell value={String(desc)}
                          {...ec({ kind: 'expense', idx: i, col: 'description' }, String(desc))} />
                        <EditableCell value={fmtCLP(net)} align="right" color={C.danger}
                          {...ec({ kind: 'expense', idx: i, col: 'amountNet' }, net != null ? String(Math.round(net)) : '')} />
                        <td style={{ ...TD, textAlign: 'center' }}>
                          <div style={{
                            display: 'inline-flex', borderRadius: 20, overflow: 'hidden',
                            border: `1px solid ${C.border}`,
                          }}>
                            {(['factura', 'boleta'] as const).map(t => (
                              <button
                                key={t}
                                onClick={() => setExpTipo(i, tipo === t ? null : t)}
                                style={{
                                  padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                  border: 'none', outline: 'none',
                                  color: tipo === t ? '#fff' : C.textMuted,
                                  background: tipo === t
                                    ? (t === 'factura' ? '#1C2D5A' : C.textSec)
                                    : 'transparent',
                                  transition: 'all 0.12s',
                                }}
                              >
                                {t === 'factura' ? 'Factura' : 'Boleta'}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {withTax != null ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                              <span style={{ color: C.textSec }}>{fmtCLP(withTax)}</span>
                              <span style={{ fontSize: 9, color: C.textMuted, opacity: 0.6 }}>
                                ×{tipo === 'factura' ? '1.19' : '1.153'}
                              </span>
                            </span>
                          ) : (
                            <span style={{ color: C.textMuted }}>—</span>
                          )}
                        </td>
                        <td style={{ ...TD, textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              const expEdits = { ...(edits.expenses ?? {}) }
                              expEdits[i] = { ...(expEdits[i] ?? {}), paid: !isPaid }
                              persist({ ...edits, expenses: expEdits })
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                              fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                              border: `1px solid ${isPaid ? C.successBorder : C.border}`,
                              background: isPaid ? 'rgba(22,163,74,0.1)' : 'transparent',
                              color: isPaid ? C.success : C.textMuted,
                            }}
                          >
                            {isPaid ? '✓ Pagado' : 'Pendiente'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: C.listBg, borderTop: `2px solid ${C.border}` }}>
                    <td style={{ ...TD, fontWeight: 700, color: C.textSec }}>Total Egresos</td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: C.danger, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtCLP(totalEgresosCalc)}
                    </td>
                    <td style={TD} />
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>
                      {hasExpTipos ? fmtCLP(totalWithTax) : '—'}
                    </td>
                    <td style={TD} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Observations */}
        <div>
          <SectionTitle>Observaciones</SectionTitle>
          {active?.kind === 'obs' ? (
            <textarea
              autoFocus value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Escape') setActive(null) }}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontSize: 13, color: C.textSec, lineHeight: 1.7,
                padding: '14px 16px', borderRadius: 10,
                background: C.warningBg, border: `1.5px solid ${C.orange}`,
                resize: 'vertical', minHeight: 80, outline: 'none',
              }}
            />
          ) : (
            <div
              onClick={() => startEdit({ kind: 'obs' }, observations)}
              style={{
                fontSize: 13, lineHeight: 1.7, cursor: 'pointer',
                padding: '14px 16px', borderRadius: 10,
                color: observations ? C.textSec : C.textMuted,
                background: C.warningBg, border: `1px solid ${C.warningBorder}`,
              }}
            >
              {observations || '✎ Click para agregar observaciones...'}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Select style ─────────────────────────────────────────────────────────────

const SEL: React.CSSProperties = {
  height: 38, padding: '0 10px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, color: '#0F1A2E',
  background: '#FFFFFF', outline: 'none',
  cursor: 'pointer', flexShrink: 0,
}

type StatusF  = 'todos' | 'activos' | 'finalizados'
type AmbitoF  = 'todos' | 'Público' | 'Privado'

// ─── Module ───────────────────────────────────────────────────────────────────

interface Props {
  projects: ProjectListItem[]
}

export function ProyectosModule({ projects }: Props) {
  const isMobile = useIsMobile()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail]         = useState<ProjectDetail | null>(null)
  const [loading, setLoading]       = useState(false)

  const [statusF,  setStatusF]  = useState<StatusF>('todos')
  const [ambitoF,  setAmbitoF]  = useState<AmbitoF>('todos')

  const [statusOverrides, setStatusOverrides] = useState<Record<number, 'active' | 'finalized'>>({})

  useEffect(() => {
    fetch('/api/project-statuses')
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<number, 'active' | 'finalized'>) => setStatusOverrides(data))
      .catch(() => {})
  }, [])

  const effectiveIsFinalized = useCallback((id: number) =>
    (statusOverrides[id] ?? 'active') === 'finalized'
  , [statusOverrides])

  const toggleProjectStatus = useCallback(async (id: number, status: 'active' | 'finalized') => {
    setStatusOverrides(prev => ({ ...prev, [id]: status }))
    try {
      await fetch('/api/project-statuses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
    } catch {}
  }, [])

  const liveStats = useMemo(() => {
    const active    = projects.filter(p => !effectiveIsFinalized(p.id)).length
    const finalized = projects.filter(p =>  effectiveIsFinalized(p.id)).length
    return { total: projects.length, active, finalized }
  }, [projects, effectiveIsFinalized])

  const filtered = useMemo(() => projects.filter(p => {
    if (statusF  === 'activos'     &&  effectiveIsFinalized(p.id)) return false
    if (statusF  === 'finalizados' && !effectiveIsFinalized(p.id)) return false
    if (ambitoF  !== 'todos' && p.scope !== ambitoF)               return false
    return true
  }), [projects, statusF, ambitoF, effectiveIsFinalized])

  const isFiltering = statusF !== 'todos' || ambitoF !== 'todos'

  const selectProject = useCallback(async (id: number) => {
    if (id === selectedId) return
    setSelectedId(id)
    setDetail(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) setDetail(await res.json())
    } catch {}
    setLoading(false)
  }, [selectedId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.canvas }}>

      {/* Header */}
      <div style={{ padding: isMobile ? '14px 14px 0' : '20px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'center' : 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>Proyectos</h1>
            {!isMobile && (
              <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textSec }}>
                Gestión de proyectos de ingeniería vial
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
            {([
              { label: 'Total',   value: liveStats.total,     color: C.textPrimary, filter: 'todos'        as StatusF },
              { label: 'Activos', value: liveStats.active,    color: C.orange,      filter: 'activos'      as StatusF },
              { label: 'Fin.',    value: liveStats.finalized, color: C.success,     filter: 'finalizados'  as StatusF },
            ]).map(s => {
              const isActive = statusF === s.filter
              return (
                <button key={s.label} onClick={() => setStatusF(s.filter)} style={{
                  background:  isActive ? s.color : C.card,
                  border:      `1px solid ${isActive ? s.color : C.border}`,
                  borderRadius: 8, padding: isMobile ? '6px 10px' : '8px 14px',
                  textAlign: 'center', minWidth: isMobile ? 44 : 62,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: isActive ? '#fff' : s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: isActive ? 'rgba(255,255,255,0.8)' : C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                    {s.label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 12 }}>
          <div style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? 'none' : 1 }}>
            <ProjectDropdown
              projects={filtered}
              selectedId={selectedId}
              onSelect={selectProject}
            />
          </div>

          <select value={statusF} onChange={e => setStatusF(e.target.value as StatusF)} style={{ ...SEL, flex: isMobile ? 1 : 'none' }}>
            <option value="todos">Estado: Todos</option>
            <option value="activos">Activos</option>
            <option value="finalizados">Finalizados</option>
          </select>

          <select value={ambitoF} onChange={e => setAmbitoF(e.target.value as AmbitoF)} style={{ ...SEL, flex: isMobile ? 1 : 'none' }}>
            <option value="todos">Ámbito: Todos</option>
            <option value="Público">Público</option>
            <option value="Privado">Privado</option>
          </select>

          {isFiltering && (
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
              {filtered.length} en lista
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'hidden',
        margin: isMobile ? '0 14px 14px' : '0 28px 28px',
        border: `1px solid ${C.border}`, borderRadius: 12,
        background: C.card, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column',
      }}>
        {loading ? (
          <Skeleton />
        ) : detail ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <DetailPanel
              detail={detail}
              currentStatus={effectiveIsFinalized(detail.id) ? 'finalized' : 'active'}
              onStatusChange={s => toggleProjectStatus(detail.id, s)}
            />
          </div>
        ) : (
          <EmptyDetail total={filtered.length} />
        )}
      </div>
    </div>
  )
}
