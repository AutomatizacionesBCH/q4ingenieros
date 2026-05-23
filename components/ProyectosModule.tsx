'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { ProjectListItem } from '@/types/ui'
import type { ProjectDetail, EP, ProjectStats } from '@/types/project'
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

interface Badge { color: string; bg: string; border: string; label: string }

function getStatusBadge(status: string, isFinalized: boolean): Badge {
  if (isFinalized)
    return { color: C.success, bg: C.successBg, border: C.successBorder, label: 'Finalizado' }
  const s = status.toLowerCase()
  if (s.includes('revisión') || s.includes('subsanacion') || s.includes('subsanación'))
    return { color: C.warning, bg: C.warningBg, border: C.warningBorder, label: status }
  if (s.includes('proceso') || s.includes('diseño'))
    return { color: C.orange, bg: '#FFF7F4', border: C.orangeBorder, label: status }
  return { color: C.textSec, bg: C.listBg, border: C.border, label: status || 'Sin estado' }
}

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

  // Close on outside click
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

  // Focus input when opens
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
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '0 12px',
          height: 38,
          border: `1px solid ${open ? C.orange : C.border}`,
          borderRadius: 8,
          background: C.card,
          cursor: 'pointer',
          color: selected ? C.textPrimary : C.textMuted,
          fontSize: 13,
          transition: 'border-color 0.1s',
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
        }}>
          ▾
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
          zIndex: 500,
          maxHeight: 420,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Search inside dropdown */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nombre, cliente o número..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '7px 10px',
                border: `1px solid ${C.border}`, borderRadius: 6,
                fontSize: 12, color: C.textPrimary,
                background: C.listBg, outline: 'none',
              }}
            />
          </div>
          {/* Count header */}
          <div style={{
            padding: '5px 12px 4px', flexShrink: 0,
            borderBottom: `1px solid ${C.border}`,
            background: C.listBg,
          }}>
            <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {shown.length} proyecto{shown.length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Scrollable list */}
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
                    width: '100%', textAlign: 'left',
                    padding: '8px 12px',
                    background: isSel ? C.orangeFaint : 'transparent',
                    borderTop: 'none', borderRight: 'none', borderLeft: 'none',
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
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

// ─── EP Tracker Expanded ──────────────────────────────────────────────────────

function EPTrackerExpanded({ eps }: { eps: EP[] }) {
  if (!eps.length)
    return <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Sin estados de pago registrados.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {eps.map((ep, i) => {
        const paid = !!ep.realDate
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '11px 14px', borderRadius: 8,
            background: paid ? C.successBg : C.orangeFaint,
            border: `1px solid ${paid ? C.successBorder : C.orangeBorder}`,
          }}>
            <div style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 3,
              background: paid ? C.success : C.orange,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                {ep.label || `EP ${i + 1}`}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                {ep.amount != null && (
                  <span style={{ fontSize: 12, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCLP(ep.amount)}
                  </span>
                )}
                {ep.estimatedDate && (
                  <span style={{ fontSize: 12, color: C.textMuted }}>
                    Est. {fmtDate(ep.estimatedDate)}
                  </span>
                )}
                {ep.realDate && (
                  <span style={{ fontSize: 12, color: C.success, fontWeight: 500 }}>
                    ✓ {fmtDate(ep.realDate)}
                  </span>
                )}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', flexShrink: 0,
              color: paid ? C.success : C.orange,
            }}>
              {paid ? 'Pagado' : 'Pendiente'}
            </span>
          </div>
        )
      })}
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

// ─── Editable KPI ─────────────────────────────────────────────────────────────

const PROJ_EDIT_KEY = 'proj_edit_v1'
interface ProjEdits {
  budget?:       number
  egresos?:      number
  eps?:          Record<number, { label?: string; amount?: number; paid?: boolean }>
  expenses?:     Record<number, { description?: string; amountNet?: number; tipo?: 'boleta' | 'factura' }>
  observations?: string
}
function loadProjEdits(id: number): ProjEdits {
  try {
    const all = JSON.parse(localStorage.getItem(PROJ_EDIT_KEY) ?? '{}') as Record<string, ProjEdits>
    return all[String(id)] ?? {}
  } catch { return {} }
}
function saveProjEdits(id: number, edits: ProjEdits) {
  try {
    const all = JSON.parse(localStorage.getItem(PROJ_EDIT_KEY) ?? '{}') as Record<string, ProjEdits>
    all[String(id)] = edits
    localStorage.setItem(PROJ_EDIT_KEY, JSON.stringify(all))
  } catch {}
}
type EditField = 'budget' | 'egresos'

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
          autoFocus
          value={inputVal}
          onChange={e => onInputChange(e.target.value)}
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

// ─── Active edit types + helpers ──────────────────────────────────────────────

type ActiveEdit =
  | { kind: 'kpi';     field: EditField }
  | { kind: 'ep';      idx: number; col: 'label' | 'amount' }
  | { kind: 'expense'; idx: number; col: 'description' | 'amountNet' }
  | { kind: 'obs' }
  | null

function dateToStr(d: string | Date | null | undefined): string {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  return (d as Date).toISOString().slice(0, 10)
}

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
          autoFocus
          value={inputVal}
          onChange={e => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${C.orange}`, borderRadius: 4,
            padding: '3px 6px', fontSize: 12, outline: 'none', background: 'white',
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

// ─── Static KPI card (auto-calculated, not editable) ─────────────────────────

function StaticKpi({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
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

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ detail }: { detail: ProjectDetail }) {
  // Only sum leaf items — section/subtotal rows are excluded to avoid double-counting
  const totalEgresosCalc = detail.expenses
    .filter(e => !e.isSection)
    .reduce((s, e) => s + (e.amountNet ?? 0), 0)

  const [edits,    setEdits]    = useState<ProjEdits>(() => loadProjEdits(detail.id))
  const [active,   setActive]   = useState<ActiveEdit>(null)
  const [inputVal, setInputVal] = useState('')

  useEffect(() => {
    setEdits(loadProjEdits(detail.id))
    setActive(null)
  }, [detail.id])

  function persist(next: ProjEdits) { setEdits(next); saveProjEdits(detail.id, next) }
  function startEdit(ae: NonNullable<ActiveEdit>, initVal: string) { setActive(ae); setInputVal(initVal) }

  const isAct = (ae: NonNullable<ActiveEdit>): boolean => {
    if (!active) return false
    if (ae.kind === 'kpi')     return active.kind === 'kpi'     && active.field === ae.field
    if (ae.kind === 'ep')      return active.kind === 'ep'      && active.idx === ae.idx && active.col === ae.col
    if (ae.kind === 'expense') return active.kind === 'expense' && active.idx === ae.idx && active.col === ae.col
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

    if (active.kind === 'kpi') {
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

  // EP helpers — paid state driven by override, falling back to realDate presence
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

  // Auto-calculated KPIs from EP states
  const pagadoCalc    = detail.eps.reduce((s, ep, i) =>  isEpPaid(ep, i) ? s + (getEp(ep, i).amount ?? 0) : s, 0)
  const pendienteCalc = detail.eps.reduce((s, ep, i) => !isEpPaid(ep, i) ? s + (getEp(ep, i).amount ?? 0) : s, 0)

  // Manually editable KPIs
  const budget  = edits.budget  ?? detail.budget?.net ?? null
  const egresos = edits.egresos ?? (totalEgresosCalc || null)

  const observations = edits.observations !== undefined ? edits.observations : (detail.observations ?? '')

  // Analysis — prefer Excel's pre-calculated values, fall back to computed
  const utilityCalc = budget != null && egresos != null ? budget - egresos : null
  const utilityShow = detail.utility ?? utilityCalc
  const marginShow  = detail.margin  ?? (budget != null && budget > 0 && utilityShow != null ? utilityShow / budget : null)
  const costoVenta  = budget != null && budget > 0 && egresos != null ? egresos / budget : null

  // Total Con Impuesto — leaf rows only (skip section headers)
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

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ paddingBottom: 20, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>#{detail.id}</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.textPrimary, lineHeight: 1.3 }}>{detail.name}</h2>
        <div style={{ fontSize: 14, color: C.textSec, marginTop: 6 }}>{detail.client}</div>
        {(detail.scope || detail.managementType) && (
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
            {[detail.scope, gestionLabel(detail.managementType)].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <EditableKpi {...kpiProps('budget',  budget,  C.textPrimary, 'Presupuesto')} />
        {/* Pagado and Pendiente are auto-calculated from EP toggle states */}
        <StaticKpi label="Pagado"    value={pagadoCalc}    color={C.success} hint="∑ EPs pagados" />
        <StaticKpi label="Pendiente" value={pendienteCalc} color={C.orange}  hint="∑ EPs pendientes" />
        <EditableKpi {...kpiProps('egresos', egresos, C.danger,      'Egresos')} />
      </div>

      {/* EPs — editable table with toggle estado */}
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
                      <EditableCell value={d.label} color={C.textPrimary}
                        {...ec({ kind: 'ep', idx: i, col: 'label'  }, d.label)} />
                      <EditableCell value={d.amount != null ? fmtCLP(d.amount) : ''} align="right" color={C.textPrimary}
                        {...ec({ kind: 'ep', idx: i, col: 'amount' }, d.amount != null ? String(Math.round(d.amount)) : '')} />
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

      {/* Egresos — editable table */}
      {detail.expenses.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>Egresos ({detail.expenses.length})</SectionTitle>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.listBg }}>
                  <th style={TH}>Descripción</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Monto Neto</th>
                  <th style={{ ...TH, textAlign: 'center', width: 150 }}>Tipo</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Con Impuesto</th>
                </tr>
              </thead>
              <tbody>
                {detail.expenses.map((e, i) => {
                  // ── Section / category header row ─────────────────────────
                  if (e.isSection) {
                    return (
                      <tr key={i} style={{ background: C.listBg, borderTop: `1px solid ${C.border}` }}>
                        <td
                          colSpan={e.amountNet !== null ? 1 : 4}
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
                            <td style={TD} />
                            <td style={TD} />
                          </>
                        )}
                      </tr>
                    )
                  }

                  // ── Leaf expense row ──────────────────────────────────────
                  const ov   = edits.expenses?.[i] ?? {}
                  const desc = ov.description ?? e.description ?? ''
                  const net  = ov.amountNet   ?? e.amountNet   ?? null
                  const tipo = ov.tipo ?? null
                  const withTax = net != null && tipo != null
                    ? Math.round(net * (tipo === 'factura' ? 1.19 : 1.153))
                    : null
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
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
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Analysis table */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Análisis</SectionTitle>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {([
                { label: 'Total Egresos',      value: fmtCLP(egresos),      color: C.danger,  bold: false },
                { label: 'Utilidad',           value: fmtCLP(utilityShow),  color: (utilityShow ?? 0) >= 0 ? C.success : C.danger, bold: true },
                { label: 'Margen de Utilidad', value: marginShow  != null ? `${(marginShow  * 100).toFixed(1)}%` : '—', color: (marginShow  ?? 0) >= 0 ? C.success : C.danger, bold: true },
                { label: 'Costo-Venta',        value: costoVenta  != null ? `${(costoVenta  * 100).toFixed(1)}%` : '—', color: C.textSec, bold: false },
              ] as { label: string; value: string; color: string; bold: boolean }[]).map((row, i) => (
                <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? C.listBg : C.card }}>
                  <td style={{ ...TD, fontWeight: row.bold ? 600 : 400, color: C.textSec, width: '60%' }}>{row.label}</td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: row.bold ? 700 : 500, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observations — always visible, editable */}
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

// ─── Filter types ─────────────────────────────────────────────────────────────

type StatusF  = 'todos' | 'activos' | 'finalizados'
type AmbitoF  = 'todos' | 'Público' | 'Privado'

// ─── Module ───────────────────────────────────────────────────────────────────

interface Props {
  projects: ProjectListItem[]
  stats: ProjectStats
}

export function ProyectosModule({ projects, stats }: Props) {
  const isMobile = useIsMobile()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail]         = useState<ProjectDetail | null>(null)
  const [loading, setLoading]       = useState(false)

  const [statusF,  setStatusF]  = useState<StatusF>('todos')
  const [ambitoF,  setAmbitoF]  = useState<AmbitoF>('todos')

  // Projects available in the dropdown (after external filters)
  const filtered = useMemo(() => projects.filter(p => {
    if (statusF  === 'activos'     && p.isFinalized)  return false
    if (statusF  === 'finalizados' && !p.isFinalized) return false
    if (ambitoF  !== 'todos' && p.scope !== ambitoF)  return false
    return true
  }), [projects, statusF, ambitoF])

  const isFiltering = statusF !== 'todos' || ambitoF !== 'todos'

  const selectProject = useCallback(async (id: number) => {
    if (id === selectedId) return
    setSelectedId(id)
    setDetail(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) setDetail(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }, [selectedId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.canvas }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '14px 14px 0' : '20px 28px 0', flexShrink: 0 }}>

        {/* Title + stat chips */}
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
            {[
              { label: 'Total',       value: stats.total,     color: C.textPrimary },
              { label: 'Activos',     value: stats.active,    color: C.orange },
              { label: 'Fin.',        value: stats.finalized, color: C.success },
            ].map(s => (
              <div key={s.label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: isMobile ? '6px 10px' : '8px 14px',
                textAlign: 'center', minWidth: isMobile ? 44 : 62,
              }}>
                <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selector row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 12 }}>
          {/* Project dropdown — full width on mobile */}
          <div style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? 'none' : 1 }}>
            <ProjectDropdown
              projects={filtered}
              selectedId={selectedId}
              onSelect={selectProject}
            />
          </div>

          <select value={statusF}  onChange={e => setStatusF(e.target.value as StatusF)}   style={{ ...SEL, flex: isMobile ? 1 : 'none' }}>
            <option value="todos">Estado: Todos</option>
            <option value="activos">Activos</option>
            <option value="finalizados">Finalizados</option>
          </select>

          <select value={ambitoF}  onChange={e => setAmbitoF(e.target.value as AmbitoF)}   style={{ ...SEL, flex: isMobile ? 1 : 'none' }}>
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

      {/* ── Content (full width) ────────────────────────────────────────────── */}
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
            <DetailPanel detail={detail} />
          </div>
        ) : (
          <EmptyDetail total={filtered.length} />
        )}
      </div>
    </div>
  )
}
