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
        setOpen(false)
        setQ('')
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
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s',
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
  padding: '8px 12px', textAlign: 'left',
  fontSize: 10, fontWeight: 700, color: '#94A3B8',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}
const TD: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, color: '#0F1A2E',
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: C.textMuted,
      paddingBottom: 10, marginBottom: 12,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {children}
    </div>
  )
}

// ─── ProjEdits type ───────────────────────────────────────────────────────────

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

// ─── Editable KPI card ────────────────────────────────────────────────────────

function EditableKpi({
  label, value, color, isEditing, isOverridden, inputVal,
  onStartEdit, onInputChange, onCommit, onCancel, onReset,
}: {
  label: string; value: number | null; color: string
  isEditing: boolean; isOverridden: boolean; inputVal: string
  onStartEdit: (v: number | null) => void
  onInputChange: (v: string) => void
  onCommit: () => void; onCancel: () => void; onReset: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Select all text the moment edit mode activates — prevents cursor-at-end with giant numbers
  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  return (
    <div
      onClick={() => { if (!isEditing) onStartEdit(value) }}
      style={{
        background: C.card,
        border: `1px solid ${isEditing ? C.orange : C.border}`,
        borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
        transition: 'border-color 0.1s',
      }}
    >
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase', color: C.textMuted, marginBottom: 8,
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
          ref={inputRef}
          autoFocus
          value={inputVal}
          onChange={e => onInputChange(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 17, fontWeight: 700, color,
            fontVariantNumeric: 'tabular-nums',
            border: 'none', outline: 'none', background: 'transparent',
            padding: 0, lineHeight: 1,
          }}
        />
      ) : (
        <>
          <div style={{ fontSize: 17, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {fmtCLP(value)}
          </div>
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 5, opacity: 0.6 }}>
            ✎ editar
          </div>
        </>
      )}
    </div>
  )
}

// ─── Static KPI card ──────────────────────────────────────────────────────────

function StaticKpi({ label, value, color, hint }: { label: string; value: number | null; color: string; hint: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase', color: C.textMuted, marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {fmtCLP(value)}
      </div>
      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 5, opacity: 0.5 }}>{hint}</div>
    </div>
  )
}

// ─── Retention KPI card ───────────────────────────────────────────────────────

function RetentionKpi({
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
      background: C.card,
      border: `1px solid ${isEditing ? C.orange : C.border}`,
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase', color: C.textMuted, marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>Retención SII</span>
        {isOverridden && (
          <span onClick={onReset} title="Restaurar"
            style={{ cursor: 'pointer', color: C.orange, fontSize: 13, lineHeight: 1 }}>↺</span>
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
            onFocus={e => e.target.select()}
            onBlur={onCommit}
            onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
            placeholder="ej: 15.25"
            style={{
              width: '100%', boxSizing: 'border-box',
              fontSize: 17, fontWeight: 700, color: C.textMuted,
              border: 'none', outline: 'none', background: 'transparent',
              padding: 0, lineHeight: 1,
            }}
          />
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 4, opacity: 0.6 }}>Ingresa el porcentaje (sin %)</div>
        </div>
      ) : (
        <div onClick={onStartEdit} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.textMuted, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {pct != null ? `${pct.toFixed(2)}%` : '—'}
          </div>
          {amount != null && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {fmtCLP(amount)}
            </div>
          )}
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3, opacity: 0.6 }}>✎ editar</div>
        </div>
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

// ─── Editable table cell ──────────────────────────────────────────────────────

function EditableCell({
  value, isEditing, inputVal, onStart, onChange, onCommit, onCancel,
  align = 'left', color, numeric = false,
}: {
  value: string; isEditing: boolean; inputVal: string
  onStart: () => void; onChange: (v: string) => void
  onCommit: () => void; onCancel: () => void
  align?: 'left' | 'right'; color?: string; numeric?: boolean
}) {
  return (
    <td
      onClick={() => { if (!isEditing) onStart() }}
      style={{ ...TD, textAlign: align, cursor: 'pointer', color: color ?? C.textPrimary }}
    >
      {isEditing ? (
        <input
          autoFocus
          value={inputVal}
          onChange={e => onChange(e.target.value)}
          // Always select-all on focus — crucial for numeric fields with large pre-filled values
          onFocus={e => e.target.select()}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${C.orange}`, borderRadius: 4,
            padding: '3px 6px', fontSize: 12, outline: 'none', background: 'white',
            fontVariantNumeric: numeric ? 'tabular-nums' : 'normal',
          }}
        />
      ) : (
        <span style={{
          display: 'flex', alignItems: 'center', minHeight: 20, gap: 5,
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        }}>
          {align === 'right' && <span style={{ fontSize: 9, color: C.textMuted, opacity: 0.45 }}>✎</span>}
          <span>{value || '—'}</span>
          {align !== 'right' && <span style={{ fontSize: 9, color: C.textMuted, opacity: 0.45 }}>✎</span>}
        </span>
      )}
    </td>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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

  // Stale-flag prevents async load from overwriting in-progress user edits
  useEffect(() => {
    let stale = false
    setActive(null)
    setEdits({})
    loadProjEdits(detail.id).then(loaded => {
      if (!stale) setEdits(prev => ({ ...loaded, ...prev }))
    })
    return () => { stale = true }
  }, [detail.id])

  // Uses edited amountNet per row so the KPI updates live as expenses are edited
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
      if      (active.col === 'description') { cur.description = inputVal || undefined }
      else if (active.col === 'amountNet')   { const n = toNum(inputVal); if (!isNaN(n)) cur.amountNet = n }
      expEdits[active.idx] = cur
      persist({ ...edits, expenses: expEdits })

    } else if (active.kind === 'obs') {
      persist({ ...edits, observations: inputVal })
    }
    setActive(null)
  }

  function resetField(field: EditField) {
    const next = { ...edits }
    delete next[field]
    persist(next)
  }
  function resetRetention() {
    const next = { ...edits }
    delete next.retentionPct
    delete next.retentionTipo
    persist(next)
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

  // Líquido: explicit override > gross − retention > Excel net
  const budget = edits.budget ??
    (grossVal != null && retentionVal != null ? grossVal - retentionVal : null) ??
    detail.budget?.net ?? null

  const egresos = edits.egresos ?? (totalEgresosCalc || null)

  const observations = edits.observations !== undefined ? edits.observations : (detail.observations ?? '')

  // Neto always computed to avoid #¡REF! errors from Excel
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

  const kpiProps = (field: EditField, value: number | null, color: string, label: string) => ({
    label, value, color,
    isEditing:     active?.kind === 'kpi' && active.field === field,
    isOverridden:  edits[field] != null,
    inputVal:      active?.kind === 'kpi' && active.field === field ? inputVal : '',
    onStartEdit:   (v: number | null) => startEdit({ kind: 'kpi', field }, v != null ? String(Math.round(v)) : ''),
    onInputChange: setInputVal,
    onCommit:      commitEdit,
    onCancel:      () => setActive(null),
    onReset:       () => resetField(field),
  })

  // Ref for the analysis-table egresos input (to call select() there too)
  const analysisEgresosRef = useRef<HTMLInputElement>(null)
  const isEditingAnalysisEgresos = active?.kind === 'kpi' && active.field === 'egresos'
  useEffect(() => {
    if (isEditingAnalysisEgresos) analysisEgresosRef.current?.select()
  }, [isEditingAnalysisEgresos])

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 900 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: 20, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>#{detail.id}</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.textPrimary, lineHeight: 1.3 }}>{detail.name}</h2>
            <div style={{ fontSize: 14, color: C.textSec, marginTop: 6 }}>{detail.client}</div>
            {(detail.scope || detail.managementType) && (
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                {[detail.scope, gestionLabel(detail.managementType)].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 2 }}>
            {(['active', 'finalized'] as const).map(s => {
              const isOn = currentStatus === s
              const color = s === 'active' ? C.orange : C.success
              return (
                <button key={s} onClick={() => onStatusChange(s)} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
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

      {/* ── KPIs — desglose presupuesto ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <EditableKpi {...kpiProps('gross', grossVal, C.textPrimary, 'Bruto')} />
        <RetentionKpi
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
        <EditableKpi {...kpiProps('budget', budget, C.textPrimary, 'Líquido')} />
      </div>

      {/* ── KPIs — flujo de caja ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        <StaticKpi label="Pagado"    value={pagadoCalc}    color={C.success} hint="∑ EPs pagados" />
        <StaticKpi label="Pendiente" value={pendienteCalc} color={C.orange}  hint="∑ EPs pendientes" />
        <EditableKpi {...kpiProps('egresos', egresos, C.danger, 'Egresos')} />
      </div>

      {/* ── EPs ─────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Estados de Pago ({detail.eps.length})</SectionTitle>
        {detail.eps.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Sin estados de pago registrados.</p>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
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
                    <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                      <EditableCell
                        value={d.label} color={C.textPrimary}
                        {...ec({ kind: 'ep', idx: i, col: 'label' }, d.label)}
                      />
                      <EditableCell
                        value={d.amount != null ? fmtCLP(d.amount) : ''} align="right" color={C.textPrimary} numeric
                        {...ec({ kind: 'ep', idx: i, col: 'amount' }, d.amount != null ? String(Math.round(d.amount)) : '')}
                      />
                      <td style={{ ...TD, textAlign: 'center' }}>
                        <button
                          onClick={() => toggleEpPaid(i)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                            fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                            color: paid ? C.success : C.orange,
                            background: paid ? C.successBg : C.orangeFaint,
                            border: `1px solid ${paid ? C.successBorder : C.orangeBorder}`,
                          }}
                        >
                          {paid ? '✓ Pagado' : 'Pendiente'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Egresos ─────────────────────────────────────────────────────────── */}
      {detail.expenses.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>Egresos ({detail.expenses.filter(e => !e.isSection).length})</SectionTitle>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
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
                  // Section / category header
                  if (e.isSection) {
                    return (
                      <tr key={i} style={{ background: C.listBg, borderTop: `1px solid ${C.border}` }}>
                        <td
                          colSpan={e.amountNet !== null ? 1 : 5}
                          style={{
                            ...TD, fontWeight: 700, fontSize: 11,
                            color: C.textPrimary, letterSpacing: '0.05em',
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

                  // Leaf expense row
                  const ov      = edits.expenses?.[i] ?? {}
                  const desc    = ov.description ?? e.description ?? ''
                  const net     = ov.amountNet   ?? e.amountNet   ?? null
                  const tipo    = ov.tipo ?? null
                  const withTax = net != null && tipo != null
                    ? Math.round(net * (tipo === 'factura' ? 1.19 : 1.153))
                    : null
                  const isPaid  = ov.paid === true

                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <EditableCell
                        value={String(desc)}
                        {...ec({ kind: 'expense', idx: i, col: 'description' }, String(desc))}
                      />
                      <EditableCell
                        value={fmtCLP(net)} align="right" color={C.danger} numeric
                        {...ec({ kind: 'expense', idx: i, col: 'amountNet' }, net != null ? String(Math.round(net)) : '')}
                      />
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
                            background: isPaid ? C.successBg : 'transparent',
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
                  <td style={{ ...TD, fontWeight: 700 }}>Total</td>
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

      {/* ── Análisis ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Análisis</SectionTitle>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>

              {/* Total Egresos — editable. Shows input right here so user doesn't need to scroll. */}
              <tr style={{ background: C.listBg }}>
                <td style={{ ...TD, color: C.textSec, width: '60%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Total Egresos
                    {edits.egresos != null && (
                      <span
                        onClick={() => resetField('egresos')}
                        title="Restaurar valor calculado desde tabla"
                        style={{ cursor: 'pointer', color: C.orange, fontSize: 13, lineHeight: 1, opacity: 0.8 }}
                      >↺</span>
                    )}
                  </span>
                </td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {isEditingAnalysisEgresos ? (
                    <input
                      ref={analysisEgresosRef}
                      autoFocus
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      onFocus={e => e.target.select()}
                      onBlur={commitEdit}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setActive(null) }}
                      style={{
                        width: '100%', textAlign: 'right', boxSizing: 'border-box',
                        fontSize: 13, fontWeight: 500, color: C.danger,
                        border: `1.5px solid ${C.orange}`, borderRadius: 5,
                        padding: '3px 6px', outline: 'none', background: '#FFFBF0',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(
                        { kind: 'kpi', field: 'egresos' },
                        egresos != null ? String(Math.round(egresos)) : '0'
                      )}
                      title="Clic para editar"
                      style={{
                        cursor: 'text', color: C.danger, fontWeight: 500,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '2px 4px', borderRadius: 4,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {fmtCLP(egresos)}
                      <span style={{ fontSize: 9, color: C.textMuted, opacity: 0.45 }}>✎</span>
                    </span>
                  )}
                </td>
              </tr>

              {/* Static rows */}
              {([
                {
                  label: 'Neto Q4 Ingenieros',
                  value: fmtCLP(neto),
                  color: neto == null ? C.textSec : neto >= 0 ? C.success : C.danger,
                  bold: true,
                },
                {
                  label: 'Margen de Utilidad',
                  value: marginCalc != null ? `${(marginCalc * 100).toFixed(1)}%` : '—',
                  color: (marginCalc ?? 0) >= 0 ? C.success : C.danger,
                  bold: true,
                },
                {
                  label: 'Costo-Venta',
                  value: costoVenta != null ? `${(costoVenta * 100).toFixed(1)}%` : '—',
                  color: C.textSec,
                  bold: false,
                },
              ] as { label: string; value: string; color: string; bold: boolean }[]).map((row, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.listBg }}>
                  <td style={{ ...TD, fontWeight: row.bold ? 600 : 400, color: C.textSec, width: '60%' }}>
                    {row.label}
                  </td>
                  <td style={{
                    ...TD, textAlign: 'right',
                    fontWeight: row.bold ? 700 : 500, color: row.color,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Observaciones ────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Observaciones</SectionTitle>
        {active?.kind === 'obs' ? (
          <textarea
            autoFocus
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Escape') setActive(null) }}
            style={{
              width: '100%', boxSizing: 'border-box',
              fontSize: 13, color: C.textSec, lineHeight: 1.7,
              padding: '14px 16px', borderRadius: 8,
              background: C.warningBg, border: `1px solid ${C.orange}`,
              resize: 'vertical', minHeight: 72, outline: 'none',
            }}
          />
        ) : (
          <div
            onClick={() => startEdit({ kind: 'obs' }, observations)}
            style={{
              fontSize: 13, lineHeight: 1.7, cursor: 'pointer',
              padding: '14px 16px', borderRadius: 8,
              color: observations ? C.textSec : C.textMuted,
              background: C.warningBg, border: `1px solid ${C.warningBorder}`,
            }}
          >
            {observations || '✎ Click para agregar observaciones...'}
          </div>
        )}
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

type StatusF = 'todos' | 'activos' | 'finalizados'
type AmbitoF = 'todos' | 'Público' | 'Privado'

// ─── Module ───────────────────────────────────────────────────────────────────

interface Props {
  projects: ProjectListItem[]
}

export function ProyectosModule({ projects }: Props) {
  const isMobile = useIsMobile()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail]         = useState<ProjectDetail | null>(null)
  const [loading, setLoading]       = useState(false)

  const [statusF, setStatusF] = useState<StatusF>('todos')
  const [ambitoF, setAmbitoF] = useState<AmbitoF>('todos')

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
    if (statusF === 'activos'     &&  effectiveIsFinalized(p.id)) return false
    if (statusF === 'finalizados' && !effectiveIsFinalized(p.id)) return false
    if (ambitoF !== 'todos' && p.scope !== ambitoF)               return false
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
              { label: 'Total',   value: liveStats.total,     color: C.textPrimary, filter: 'todos'       as StatusF },
              { label: 'Activos', value: liveStats.active,    color: C.orange,      filter: 'activos'     as StatusF },
              { label: 'Fin.',    value: liveStats.finalized, color: C.success,     filter: 'finalizados' as StatusF },
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
