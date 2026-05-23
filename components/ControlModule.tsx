'use client'

/**
 * components/ControlModule.tsx — Control 2026 (Client Component)
 *
 * Renders:
 * 1. Pendiente summary (Público / Privado)
 * 2. Monthly summary table
 * 3. Monthly detail cards — 3 boxes per month with inline item editing
 */

import { useState, useEffect, useCallback } from 'react'
import type { ControlData, MonthDetail } from '@/lib/control-parser'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  canvas:    '#F0F2F6',
  card:      '#FFFFFF',
  border:    '#E2E8F0',
  text:      '#0F1A2E',
  textSec:   '#64748B',
  textMuted: '#94A3B8',
  orange:    '#E5501E',
  success:   '#16A34A',
  warning:   '#CA8A04',
  listBg:    '#F8FAFC',
  editBg:    '#FFFBEB',
  pubBg:     '#EFF6FF',
  privBg:    '#F5F3FF',
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCLP(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(v)
}

function parseNum(raw: string): number | null {
  const s = raw.replace(/[^0-9.,]/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

let _idSeq = 0
function uid(): string { return `item-${++_idSeq}` }

// ─── Edit types ───────────────────────────────────────────────────────────────

interface EditItem { id: string; project: string; amount: string }

interface MonthDraft {
  facturadoItems: EditItem[]
  ingresoItems:   EditItem[]
  ingresoPrivado: string
  ingresoPublico: string
  resumenFacturado:    string
  resumenIngresoCaja:  string
}

interface MonthEdits {
  facturadoItems?: { project: string; amount: number | null }[]
  ingresoItems?:   { project: string; amount: number | null }[]
  ingresoPrivado?: number | null
  ingresoPublico?: number | null
  resumenFacturado?:    number | null
  resumenIngresoCaja?:  number | null
}

const STORAGE_KEY = 'control_edits_v2'

function loadEdits(): Record<string, MonthEdits> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function saveEdits(e: Record<string, MonthEdits>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(e))
}

// ─── Pendiente summary ────────────────────────────────────────────────────────

function PendienteSection({ p }: { p: ControlData['pendiente'] }) {
  const Chip = ({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) => (
    <div style={{ background: bg, borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
      {/* Público */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', borderTop: '3px solid #2563EB' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563EB', marginBottom: 14 }}>
          Público — Pendiente
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Chip label="No Facturado" value={fmtCLP(p.publicoNoFacturado)} bg={C.pubBg} color={C.text} />
          <Chip label="Facturado / No Cobrado" value={fmtCLP(p.publicoFacturadoNoCobrado)} bg={C.pubBg} color={C.warning} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#DBEAFE', borderRadius: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total pendiente</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1D4ED8', fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(p.publicoTotal)}</span>
          </div>
        </div>
      </div>

      {/* Privado */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', borderTop: '3px solid #7C3AED' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7C3AED', marginBottom: 14 }}>
          Privado — Pendiente
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Chip label="No Facturado" value={fmtCLP(p.privadoNoFacturado)} bg={C.privBg} color={C.text} />
          <Chip label="Boletas por Cursar" value={fmtCLP(p.privadoBoletasPorCursar)} bg={C.privBg} color={C.textSec} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#EDE9FE', borderRadius: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total pendiente</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#6D28D9', fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(p.privadoTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Summary table ────────────────────────────────────────────────────────────

function SummaryTable({ summary, totals }: { summary: ControlData['summary']; totals: ControlData['totals'] }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 16 }}>
        Resumen Mensual
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['Mes', 'Facturado Real', 'Ingreso Caja'].map(h => (
                <th key={h} style={{ padding: '8px 16px 8px 0', textAlign: 'left', color: C.textMuted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '9px 16px 9px 0', color: C.text, fontWeight: 600 }}>{row.mes}</td>
                <td style={{ padding: '9px 16px 9px 0', color: row.facturado ? C.text : C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(row.facturado)}</td>
                <td style={{ padding: '9px 0', color: row.ingreso ? C.text : C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(row.ingreso)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${C.border}`, background: C.listBg }}>
              <td style={{ padding: '9px 16px 9px 0', color: C.textSec, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Q4</td>
              <td style={{ padding: '9px 16px 9px 0', color: totals.facturado != null ? C.text : C.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(totals.facturado)}</td>
              <td style={{ padding: '9px 0', color: totals.ingreso != null ? C.text : C.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(totals.ingreso)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const BoxTitle = ({ label, color }: { label: string; color: string }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
    {label}
  </div>
)

const Divider = () => <div style={{ height: 1, background: C.border, margin: '4px 0' }} />

// ─── Editable items list ──────────────────────────────────────────────────────

function ItemsList({
  items,
  editing,
  accentColor,
  onAdd,
  onRemove,
  onEdit,
}: {
  items: EditItem[]
  editing: boolean
  accentColor: string
  onAdd: () => void
  onRemove: (id: string) => void
  onEdit: (id: string, field: 'project' | 'amount', value: string) => void
}) {
  if (!editing) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((it, i) => (
        <div key={it.id} style={{
          display: 'flex', justifyContent: 'space-between', gap: 8,
          padding: '4px 0',
          borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none',
        }}>
          <span style={{ fontSize: 11, color: C.text, flex: 1, minWidth: 0 }}>{it.project || <em style={{ color: C.textMuted }}>—</em>}</span>
          <span style={{ fontSize: 11, color: C.textSec, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtCLP(parseNum(it.amount))}</span>
        </div>
      ))}
      {items.length === 0 && (
        <span style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>Sin registros</span>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map(it => (
        <div key={it.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            value={it.project}
            onChange={e => onEdit(it.id, 'project', e.target.value)}
            placeholder="Proyecto"
            style={{
              flex: 1, minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 5,
              padding: '4px 7px', fontSize: 11, color: C.text, background: C.editBg, outline: 'none',
            }}
          />
          <input
            value={it.amount}
            onChange={e => onEdit(it.id, 'amount', e.target.value)}
            placeholder="Monto"
            style={{
              width: 100, border: `1px solid ${C.border}`, borderRadius: 5,
              padding: '4px 7px', fontSize: 11, fontVariantNumeric: 'tabular-nums',
              color: C.text, background: C.editBg, outline: 'none',
            }}
          />
          <button
            onClick={() => onRemove(it.id)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
            title="Eliminar"
          >×</button>
        </div>
      ))}
      <button
        onClick={onAdd}
        style={{
          border: `1px dashed ${accentColor}`, borderRadius: 5, padding: '4px 8px',
          fontSize: 10, color: accentColor, background: 'transparent', cursor: 'pointer',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
          marginTop: 2,
        }}
      >
        + Agregar proyecto
      </button>
    </div>
  )
}

function NumInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        style={{
          border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 8px',
          fontSize: 12, fontVariantNumeric: 'tabular-nums', color: C.text,
          background: C.editBg, outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Month card ───────────────────────────────────────────────────────────────

function toEditItems(items: { project: string; amount: number | null }[]): EditItem[] {
  return items.map(it => ({ id: uid(), project: it.project, amount: it.amount !== null ? String(it.amount) : '' }))
}

function fromEditItems(items: EditItem[]): { project: string; amount: number | null }[] {
  return items.filter(it => it.project || it.amount).map(it => ({ project: it.project, amount: parseNum(it.amount) }))
}

function MonthCard({ month, edits, onSave }: {
  month: MonthDetail
  edits: MonthEdits
  onSave: (e: MonthEdits) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<MonthDraft | null>(null)

  const startEdit = () => {
    const facItems = edits.facturadoItems ?? month.facturadoItems
    const ingItems = edits.ingresoItems   ?? month.ingresoItems
    setDraft({
      facturadoItems: toEditItems(facItems),
      ingresoItems:   toEditItems(ingItems),
      ingresoPrivado:     String(edits.ingresoPrivado     ?? month.ingresoPrivado     ?? ''),
      ingresoPublico:     String(edits.ingresoPublico     ?? month.ingresoPublico     ?? ''),
      resumenFacturado:   String(edits.resumenFacturado   ?? month.resumenFacturado   ?? ''),
      resumenIngresoCaja: String(edits.resumenIngresoCaja ?? month.resumenIngresoCaja ?? ''),
    })
    setEditing(true)
  }

  const cancel = () => { setDraft(null); setEditing(false) }

  const save = () => {
    if (!draft) return
    onSave({
      facturadoItems: fromEditItems(draft.facturadoItems),
      ingresoItems:   fromEditItems(draft.ingresoItems),
      ingresoPrivado:     parseNum(draft.ingresoPrivado),
      ingresoPublico:     parseNum(draft.ingresoPublico),
      resumenFacturado:   parseNum(draft.resumenFacturado),
      resumenIngresoCaja: parseNum(draft.resumenIngresoCaja),
    })
    setDraft(null)
    setEditing(false)
  }

  // --- Helpers for draft mutations ---
  const updFacItems = (fn: (items: EditItem[]) => EditItem[]) =>
    setDraft(d => d ? { ...d, facturadoItems: fn(d.facturadoItems) } : d)
  const updIngItems = (fn: (items: EditItem[]) => EditItem[]) =>
    setDraft(d => d ? { ...d, ingresoItems: fn(d.ingresoItems) } : d)

  const editItem = (list: 'fac' | 'ing', id: string, field: 'project' | 'amount', val: string) => {
    const updater = (items: EditItem[]) =>
      items.map(it => it.id === id ? { ...it, [field]: val } : it)
    list === 'fac' ? updFacItems(updater) : updIngItems(updater)
  }
  const removeItem = (list: 'fac' | 'ing', id: string) => {
    const updater = (items: EditItem[]) => items.filter(it => it.id !== id)
    list === 'fac' ? updFacItems(updater) : updIngItems(updater)
  }
  const addItem = (list: 'fac' | 'ing') => {
    const updater = (items: EditItem[]) => [...items, { id: uid(), project: '', amount: '' }]
    list === 'fac' ? updFacItems(updater) : updIngItems(updater)
  }

  // --- Resolved display values (edits override raw) ---
  const facItems  = editing && draft ? draft.facturadoItems : toEditItems(edits.facturadoItems ?? month.facturadoItems)
  const ingItems  = editing && draft ? draft.ingresoItems   : toEditItems(edits.ingresoItems   ?? month.ingresoItems)
  const ingresoPrivado     = editing && draft ? parseNum(draft.ingresoPrivado)     : (edits.ingresoPrivado     ?? month.ingresoPrivado)
  const ingresoPublico     = editing && draft ? parseNum(draft.ingresoPublico)     : (edits.ingresoPublico     ?? month.ingresoPublico)
  const resumenFacturado   = editing && draft ? parseNum(draft.resumenFacturado)   : (edits.resumenFacturado   ?? month.resumenFacturado)
  const resumenIngresoCaja = editing && draft ? parseNum(draft.resumenIngresoCaja) : (edits.resumenIngresoCaja ?? month.resumenIngresoCaja)

  // Auto-computed totals from items
  const computedFacTotal = facItems.reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const computedIngTotal = ingItems.reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const displayFacTotal  = editing ? computedFacTotal : (edits.facturadoItems ? computedFacTotal : (month.facturadoTotal ?? computedFacTotal))
  const displayIngTotal  = editing ? computedIngTotal : (edits.ingresoItems   ? computedIngTotal : (month.ingresoTotal   ?? computedIngTotal))

  const hasEdits = Object.keys(edits).length > 0

  const boxStyle: React.CSSProperties = {
    background: C.card,
    border: `1px solid ${editing ? C.orange : C.border}`,
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }

  return (
    <div style={{ background: C.listBg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>

      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{month.mes}</span>
          {hasEdits && !editing && (
            <span style={{ fontSize: 9, background: '#FFF5F2', color: C.orange, border: `1px solid ${C.orange}`, borderRadius: 4, padding: '2px 6px', fontWeight: 700, letterSpacing: '0.05em' }}>
              EDITADO
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button onClick={cancel} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.textSec, cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={save} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, border: 'none', background: C.orange, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Guardar
              </button>
            </>
          ) : (
            <button onClick={startEdit} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.textSec, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12 }}>✏</span> Editar
            </button>
          )}
        </div>
      </div>

      {/* 3 boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: 10, alignItems: 'start' }}>

        {/* ── Box 1: Facturado ── */}
        <div style={boxStyle}>
          <BoxTitle label="Facturado" color="#0284C7" />
          <ItemsList
            items={facItems}
            editing={editing}
            accentColor="#0284C7"
            onAdd={() => addItem('fac')}
            onRemove={id => removeItem('fac', id)}
            onEdit={(id, field, val) => editItem('fac', id, field, val)}
          />
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: C.textSec }}>
              Total {editing && <span style={{ fontSize: 9, color: C.textMuted }}>(auto)</span>}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0284C7', fontVariantNumeric: 'tabular-nums' }}>
              {fmtCLP(displayFacTotal)}
            </span>
          </div>
        </div>

        {/* ── Box 2: Ingreso recibido ── */}
        <div style={boxStyle}>
          <BoxTitle label="Ingreso Recibido" color={C.textSec} />
          <ItemsList
            items={ingItems}
            editing={editing}
            accentColor={C.success}
            onAdd={() => addItem('ing')}
            onRemove={id => removeItem('ing', id)}
            onEdit={(id, field, val) => editItem('ing', id, field, val)}
          />
          <Divider />
          {/* Privado / Público breakdown */}
          {editing && draft ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <NumInput label="Privado recibido" value={draft.ingresoPrivado} onChange={v => setDraft(d => d ? { ...d, ingresoPrivado: v } : d)} />
              <NumInput label="Público recibido"  value={draft.ingresoPublico} onChange={v => setDraft(d => d ? { ...d, ingresoPublico: v } : d)} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Privado</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(ingresoPrivado)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Público</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(ingresoPublico)}</span>
              </div>
            </div>
          )}
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: C.textSec }}>
              Total {editing && <span style={{ fontSize: 9, color: C.textMuted }}>(auto)</span>}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.success, fontVariantNumeric: 'tabular-nums' }}>
              {fmtCLP(displayIngTotal)}
            </span>
          </div>
        </div>

        {/* ── Box 3: Resumen ── */}
        <div style={boxStyle}>
          <BoxTitle label="Resumen" color={C.orange} />
          {editing && draft ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <NumInput label="Total Facturado"    value={draft.resumenFacturado}   onChange={v => setDraft(d => d ? { ...d, resumenFacturado: v } : d)} />
              <NumInput label="Total Ingreso Caja" value={draft.resumenIngresoCaja} onChange={v => setDraft(d => d ? { ...d, resumenIngresoCaja: v } : d)} />
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Total Facturado</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{fmtCLP(resumenFacturado)}</div>
              </div>
              <Divider />
              <div>
                <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Total Ingreso Caja</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.success, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{fmtCLP(resumenIngresoCaja)}</div>
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

  useEffect(() => { setAllEdits(loadEdits()) }, [])

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

        <PendienteSection p={data.pendiente} />

        {data.summary.length > 0 && <SummaryTable summary={data.summary} totals={data.totals} />}

        {data.months.length > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.textMuted, marginBottom: 12 }}>
            Detalle por Mes
          </div>
        )}

        {data.months.map(month => (
          <MonthCard
            key={month.mes}
            month={month}
            edits={allEdits[month.mes] ?? {}}
            onSave={edits => handleSave(month.mes, edits)}
          />
        ))}

        {data.summary.length === 0 && data.months.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>◈</span>
            <p style={{ color: C.textMuted, fontSize: 14 }}>No se encontraron datos en el archivo de control.</p>
          </div>
        )}
      </div>
    </div>
  )
}
