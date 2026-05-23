'use client'

/**
 * components/ControlModule.tsx — Control 2026 (Client Component)
 */

import { useState, useEffect, useCallback } from 'react'
import type { ControlData, MonthDetail, TipoIngreso } from '@/lib/control-parser'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  canvas:   '#F0F2F6',
  card:     '#FFFFFF',
  border:   '#E2E8F0',
  text:     '#0F1A2E',
  textSec:  '#64748B',
  textMt:   '#94A3B8',
  orange:   '#E5501E',
  orangeL:  '#FFF5F2',
  navy:     '#0F1A2E',
  blue:     '#0284C7',
  blueL:    '#EFF9FF',
  green:    '#16A34A',
  greenL:   '#F0FDF4',
  pub:      '#2563EB',
  pubL:     '#EFF6FF',
  priv:     '#7C3AED',
  privL:    '#F5F3FF',
  listBg:   '#F8FAFC',
  editBg:   '#FFFBEB',
  shadow:   '0 2px 10px rgba(0,0,0,0.07)',
} as const

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmtCLP(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.,]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

let _seq = 0
const uid = () => `i${++_seq}`

const ALL_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── Storage ──────────────────────────────────────────────────────────────────

const KEY_EDITS  = 'ctrl_edits_v3'
const KEY_EXTRA  = 'ctrl_extra_months_v1'

interface EditItem  { id: string; project: string; amount: string }
interface IngresoEditItem extends EditItem { tipo: TipoIngreso }

interface MonthEdits {
  facturadoItems?: { project: string; amount: number | null }[]
  ingresoItems?:   { project: string; amount: number | null; tipo: TipoIngreso }[]
  resumenFacturado?:    number | null
  resumenIngresoCaja?:  number | null
}

function loadEdits(): Record<string, MonthEdits> {
  try { return JSON.parse(localStorage.getItem(KEY_EDITS) ?? '{}') } catch { return {} }
}
function saveEdits(e: Record<string, MonthEdits>) { localStorage.setItem(KEY_EDITS, JSON.stringify(e)) }
function loadExtra(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY_EXTRA) ?? '[]') } catch { return [] }
}
function saveExtra(e: string[]) { localStorage.setItem(KEY_EXTRA, JSON.stringify(e)) }

// ─── Pendiente section ────────────────────────────────────────────────────────

function PendienteSection({ p }: { p: ControlData['pendiente'] }) {
  const StatLine = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 11, color: C.textSec }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
      {/* Público */}
      <div style={{ background: C.card, borderRadius: 12, boxShadow: C.shadow, overflow: 'hidden' }}>
        <div style={{ background: C.pub, padding: '12px 18px' }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Público — Pendiente</span>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <StatLine label="No Facturado"         value={fmtCLP(p.publicoNoFacturado)}        color={C.text} />
          <StatLine label="Facturado / No Cobrado" value={fmtCLP(p.publicoFacturadoNoCobrado)} color='#CA8A04' />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.pub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total pendiente</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.pub, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(p.publicoTotal)}</span>
          </div>
        </div>
      </div>

      {/* Privado */}
      <div style={{ background: C.card, borderRadius: 12, boxShadow: C.shadow, overflow: 'hidden' }}>
        <div style={{ background: C.priv, padding: '12px 18px' }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Privado — Pendiente</span>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <StatLine label="No Facturado"       value={fmtCLP(p.privadoNoFacturado)}    color={C.text} />
          <StatLine label="Boletas por Cursar"  value={fmtCLP(p.privadoBoletasPorCursar)} color={C.textSec} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.priv, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total pendiente</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.priv, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(p.privadoTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Summary table ────────────────────────────────────────────────────────────

function SummaryTable({ summary, totals }: { summary: ControlData['summary']; totals: ControlData['totals'] }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden', marginBottom: 28 }}>
      {/* Table header */}
      <div style={{ background: C.navy, padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {['Mes', 'Facturado Real', 'Ingreso Caja'].map((h, i) => (
          <span key={h} style={{ fontSize: 10, fontWeight: 800, color: i === 0 ? '#fff' : i === 1 ? '#93C5FD' : '#86EFAC', textTransform: 'uppercase', letterSpacing: '0.09em', textAlign: i === 0 ? 'left' : 'right' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {summary.map((row, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
          padding: '12px 22px',
          background: i % 2 === 0 ? '#FAFBFD' : C.card,
          borderBottom: `1px solid ${C.border}`,
          borderLeft: `3px solid ${C.orange}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{row.mes}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.blue, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{fmtCLP(row.facturado)}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.green, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{fmtCLP(row.ingreso)}</span>
        </div>
      ))}

      {/* Total row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '14px 22px', background: '#162138' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#A8B8D0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total Q4</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#93C5FD', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{fmtCLP(totals.facturado)}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#86EFAC', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{fmtCLP(totals.ingreso)}</span>
      </div>
    </div>
  )
}

// ─── Reusable box wrapper ─────────────────────────────────────────────────────

function Box({ accent, title, children, editing }: {
  accent: string; title: string; children: React.ReactNode; editing?: boolean
}) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${editing ? accent : C.border}`,
      borderTop: `3px solid ${accent}`,
      borderRadius: 10,
      boxShadow: C.shadow,
      display: 'flex', flexDirection: 'column', gap: 0,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${C.border}`, background: `${accent}10` }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: accent }}>{title}</span>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {children}
      </div>
    </div>
  )
}

const Divider = () => <div style={{ height: 1, background: C.border, margin: '4px -14px', width: 'calc(100% + 28px)' }} />

// ─── Item row (view) ──────────────────────────────────────────────────────────

function ItemRow({ label, amount, sub, last }: { label: string; amount: number | null; sub?: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingBottom: last ? 0 : 5, borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: C.text }}>{label || <em style={{ color: C.textMt }}>—</em>}</span>
        {sub && <span style={{ fontSize: 9, color: C.textMt, display: 'block' }}>{sub}</span>}
      </div>
      <span style={{ fontSize: 11, color: C.textSec, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtCLP(amount)}</span>
    </div>
  )
}

// ─── Group label (Público / Privado) ─────────────────────────────────────────

function TipoLabel({ tipo }: { tipo: TipoIngreso }) {
  const isPublic = tipo === 'Público'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em',
      color: isPublic ? C.pub : C.priv,
      background: isPublic ? C.pubL : C.privL,
      border: `1px solid ${isPublic ? '#BFDBFE' : '#DDD6FE'}`,
      borderRadius: 4, padding: '2px 7px', marginBottom: 2,
    }}>
      {tipo}
    </div>
  )
}

// ─── Tipo toggle button ───────────────────────────────────────────────────────

function TipoToggle({ value, onChange }: { value: TipoIngreso; onChange: (v: TipoIngreso) => void }) {
  return (
    <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
      {(['Priv', 'Pub'] as const).map(abbr => {
        const full: TipoIngreso = abbr === 'Pub' ? 'Público' : 'Privado'
        const active = value === full
        return (
          <button key={abbr} onClick={() => onChange(full)} style={{
            fontSize: 9, padding: '3px 7px', border: 'none', cursor: 'pointer', fontWeight: 800,
            background: active ? (full === 'Público' ? C.pub : C.priv) : '#F1F5F9',
            color: active ? '#fff' : C.textMt,
            letterSpacing: '0.04em',
          }}>
            {abbr}
          </button>
        )
      })}
    </div>
  )
}

// ─── Editable item rows ───────────────────────────────────────────────────────

function EditRow({ item, onEdit, onRemove, tipoField }: {
  item: EditItem | IngresoEditItem
  tipoField?: boolean
  onEdit: (field: string, val: string) => void
  onRemove: () => void
}) {
  const hasType = tipoField && 'tipo' in item
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {hasType && (
        <TipoToggle
          value={(item as IngresoEditItem).tipo}
          onChange={v => onEdit('tipo', v)}
        />
      )}
      <input value={item.project} onChange={e => onEdit('project', e.target.value)}
        placeholder="Proyecto" style={{ flex: 1, minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 7px', fontSize: 11, background: C.editBg, color: C.text, outline: 'none' }} />
      <input value={item.amount} onChange={e => onEdit('amount', e.target.value)}
        placeholder="Monto" style={{ width: 90, border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 7px', fontSize: 11, fontVariantNumeric: 'tabular-nums', background: C.editBg, color: C.text, outline: 'none' }} />
      <button onClick={onRemove} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 16, padding: '0 3px', lineHeight: 1 }}>×</button>
    </div>
  )
}

function AddItemBtn({ accent, label, onClick }: { accent: string; label?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ border: `1px dashed ${accent}`, borderRadius: 5, padding: '4px 0', fontSize: 9, color: accent, background: 'transparent', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', width: '100%' }}>
      + {label ?? 'Agregar proyecto'}
    </button>
  )
}

// ─── Total line ───────────────────────────────────────────────────────────────

function TotalLine({ label, value, color, big, note }: { label: string; value: number | null; color: string; big?: boolean; note?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: C.textSec }}>
        {label} {note && <span style={{ fontSize: 9, color: C.textMt }}>({note})</span>}
      </span>
      <span style={{ fontSize: big ? 15 : 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {fmtCLP(value)}
      </span>
    </div>
  )
}

// ─── Month card ───────────────────────────────────────────────────────────────

interface Draft {
  facItems:  EditItem[]
  ingItems:  IngresoEditItem[]
  resFac:    string
  resIng:    string
}

function toFacEdit(items: { project: string; amount: number | null }[]): EditItem[] {
  return items.map(it => ({ id: uid(), project: it.project, amount: it.amount != null ? String(it.amount) : '' }))
}
function toIngEdit(items: { project: string; amount: number | null; tipo: TipoIngreso }[]): IngresoEditItem[] {
  return items.map(it => ({ id: uid(), project: it.project, amount: it.amount != null ? String(it.amount) : '', tipo: it.tipo }))
}

function MonthCard({ mes, month, edits, onSave, onDelete }: {
  mes: string
  month: MonthDetail | null   // null = added month (user-created)
  edits: MonthEdits
  onSave: (e: MonthEdits) => void
  onDelete?: () => void        // for user-added months
}) {
  const [editing, setEditing] = useState(!month) // new months start in edit mode
  const [draft, setDraft] = useState<Draft | null>(null)

  const startEdit = () => {
    const fac = edits.facturadoItems ?? month?.facturadoItems ?? []
    const ing = edits.ingresoItems   ?? (month?.ingresoItems.map(it => ({ project: it.project, amount: it.amount, tipo: it.tipo })) ?? [])
    setDraft({
      facItems: toFacEdit(fac),
      ingItems: toIngEdit(ing),
      resFac:   String(edits.resumenFacturado   ?? month?.resumenFacturado   ?? ''),
      resIng:   String(edits.resumenIngresoCaja ?? month?.resumenIngresoCaja ?? ''),
    })
    setEditing(true)
  }

  const cancel = () => {
    if (!month) return // new month: can't cancel to a non-state
    setDraft(null)
    setEditing(false)
  }

  const save = () => {
    if (!draft) return
    onSave({
      facturadoItems: draft.facItems.filter(it => it.project || it.amount)
        .map(it => ({ project: it.project, amount: parseNum(it.amount) })),
      ingresoItems: draft.ingItems.filter(it => it.project || it.amount)
        .map(it => ({ project: it.project, amount: parseNum(it.amount), tipo: it.tipo })),
      resumenFacturado:    parseNum(draft.resFac),
      resumenIngresoCaja:  parseNum(draft.resIng),
    })
    setDraft(null)
    setEditing(false)
  }

  // ── Draft mutation helpers ──
  const updFac = (fn: (l: EditItem[]) => EditItem[]) => setDraft(d => d ? { ...d, facItems: fn(d.facItems) } : d)
  const updIng = (fn: (l: IngresoEditItem[]) => IngresoEditItem[]) => setDraft(d => d ? { ...d, ingItems: fn(d.ingItems) } : d)

  const editFac = (id: string, f: string, v: string) => updFac(l => l.map(it => it.id === id ? { ...it, [f]: v } : it))
  const editIng = (id: string, f: string, v: string) => updIng(l => l.map(it => it.id === id ? { ...it, [f]: v } as IngresoEditItem : it))
  const rmFac = (id: string) => updFac(l => l.filter(it => it.id !== id))
  const rmIng = (id: string) => updIng(l => l.filter(it => it.id !== id))
  const addFac = () => updFac(l => [...l, { id: uid(), project: '', amount: '' }])
  const addIng = () => updIng(l => [...l, { id: uid(), project: '', amount: '', tipo: 'Privado' }])

  // ── Resolved display values ──
  const rawFac = month?.facturadoItems ?? []
  const rawIng = month?.ingresoItems   ?? []

  const facItems:    EditItem[]       = editing && draft ? draft.facItems : toFacEdit(edits.facturadoItems ?? rawFac)
  const ingItems: IngresoEditItem[]   = editing && draft ? draft.ingItems : toIngEdit(edits.ingresoItems ?? rawIng.map(it => ({ project: it.project, amount: it.amount, tipo: it.tipo })))

  const computedFacTotal = facItems.reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const computedIngTotal = ingItems.reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const computedPrivTotal = ingItems.filter(it => it.tipo === 'Privado').reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const computedPubTotal  = ingItems.filter(it => it.tipo === 'Público').reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)

  const resFac = editing && draft ? parseNum(draft.resFac) : (edits.resumenFacturado   ?? month?.resumenFacturado)
  const resIng = editing && draft ? parseNum(draft.resIng) : (edits.resumenIngresoCaja ?? month?.resumenIngresoCaja)

  const hasEdits = Object.keys(edits).length > 0

  // ── View: group ingreso items by tipo ──
  const ingByTipo: Record<TipoIngreso, IngresoEditItem[]> = { Público: [], Privado: [] }
  ingItems.forEach(it => ingByTipo[it.tipo].push(it))

  return (
    <div style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden', marginBottom: 18 }}>

      {/* Month header */}
      <div style={{ background: editing ? C.orange : C.navy, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{mes}</span>
          {hasEdits && !editing && (
            <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 4, padding: '2px 7px', fontWeight: 700, letterSpacing: '0.05em' }}>EDITADO</span>
          )}
          {!month && (
            <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>NUEVO</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              {month && (
                <button onClick={cancel} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  Cancelar
                </button>
              )}
              <button onClick={save} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, border: 'none', background: '#fff', color: C.orange, cursor: 'pointer', fontWeight: 800 }}>
                Guardar
              </button>
            </>
          ) : (
            <>
              {onDelete && (
                <button onClick={onDelete} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600 }}>
                  Eliminar
                </button>
              )}
              <button onClick={startEdit} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>✏</span> Editar
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3 boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.65fr', gap: 14, padding: '16px 18px' }}>

        {/* ── Box 1: Facturado ── */}
        <Box accent={C.blue} title="Facturado" editing={editing}>
          {editing && draft ? (
            <>
              {draft.facItems.map(it => (
                <EditRow key={it.id} item={it} onRemove={() => rmFac(it.id)} onEdit={(f, v) => editFac(it.id, f, v)} />
              ))}
              <AddItemBtn accent={C.blue} onClick={addFac} />
            </>
          ) : (
            <>
              {facItems.map((it, i) => (
                <ItemRow key={it.id} label={it.project} amount={parseNum(it.amount)} last={i === facItems.length - 1} />
              ))}
              {facItems.length === 0 && <span style={{ fontSize: 11, color: C.textMt, fontStyle: 'italic' }}>Sin registros</span>}
            </>
          )}
          <Divider />
          <TotalLine label="Total" value={computedFacTotal || null} color={C.blue} big note={editing ? 'auto' : undefined} />
        </Box>

        {/* ── Box 2: Ingreso recibido ── */}
        <Box accent={C.green} title="Ingreso Recibido" editing={editing}>
          {editing && draft ? (
            <>
              {draft.ingItems.map(it => (
                <EditRow key={it.id} item={it} tipoField onRemove={() => rmIng(it.id)} onEdit={(f, v) => editIng(it.id, f, v)} />
              ))}
              <AddItemBtn accent={C.green} onClick={addIng} />
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <TotalLine label="Privado" value={computedPrivTotal || null} color={C.priv} />
                <TotalLine label="Público"  value={computedPubTotal  || null} color={C.pub} />
              </div>
            </>
          ) : (
            <>
              {(['Privado', 'Público'] as TipoIngreso[]).map(tipo => {
                const group = ingByTipo[tipo]
                if (group.length === 0 && (tipo === 'Público' && computedPubTotal === 0)) return null
                return (
                  <div key={tipo}>
                    <TipoLabel tipo={tipo} />
                    {group.length === 0
                      ? <span style={{ fontSize: 10, color: C.textMt, fontStyle: 'italic', paddingLeft: 2 }}>Sin registros</span>
                      : group.map((it, i) => (
                        <ItemRow key={it.id} label={it.project} amount={parseNum(it.amount)} last={i === group.length - 1} />
                      ))
                    }
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4, paddingBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: tipo === 'Público' ? C.pub : C.priv, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtCLP(tipo === 'Privado' ? computedPrivTotal : computedPubTotal)}
                      </span>
                    </div>
                  </div>
                )
              })}
              {/* Excel reference if available */}
              {month && (month.ingresoPrivadoRef !== null || month.ingresoPublicoRef !== null) && (
                <div style={{ fontSize: 9, color: C.textMt, background: C.listBg, borderRadius: 5, padding: '4px 8px' }}>
                  Ref. Excel — Priv: {fmtCLP(month.ingresoPrivadoRef)} / Pub: {fmtCLP(month.ingresoPublicoRef)}
                </div>
              )}
            </>
          )}
          <Divider />
          <TotalLine label="Total" value={computedIngTotal || null} color={C.green} big note={editing ? 'auto' : undefined} />
        </Box>

        {/* ── Box 3: Resumen ── */}
        <Box accent={C.orange} title="Resumen" editing={editing}>
          {editing && draft ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total Facturado</label>
                <input value={draft.resFac} onChange={e => setDraft(d => d ? { ...d, resFac: e.target.value } : d)}
                  placeholder="0" style={{ border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 8px', fontSize: 12, fontVariantNumeric: 'tabular-nums', background: C.editBg, color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 9, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total Ingreso Caja</label>
                <input value={draft.resIng} onChange={e => setDraft(d => d ? { ...d, resIng: e.target.value } : d)}
                  placeholder="0" style={{ border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 8px', fontSize: 12, fontVariantNumeric: 'tabular-nums', background: C.editBg, color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 9, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Total Facturado</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{fmtCLP(resFac)}</div>
              </div>
              <Divider />
              <div>
                <div style={{ fontSize: 9, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Total Ingreso Caja</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.green, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{fmtCLP(resIng)}</div>
              </div>
              {/* Efficiency mini-bar */}
              {resFac && resIng && resFac > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (resIng / resFac) * 100)}%`, background: C.green, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.textMt, marginTop: 3 }}>
                    {((resIng / resFac) * 100).toFixed(1)}% cobrado
                  </div>
                </div>
              )}
            </>
          )}
        </Box>

      </div>
    </div>
  )
}

// ─── Add month panel ──────────────────────────────────────────────────────────

function AddMonthPanel({ existingMonths, onAdd }: { existingMonths: string[]; onAdd: (mes: string) => void }) {
  const [open, setOpen] = useState(false)
  const available = ALL_MONTHS.filter(m => !existingMonths.includes(m))

  if (available.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          width: '100%', border: `2px dashed ${C.orange}`, borderRadius: 12, padding: '14px',
          background: C.orangeL, color: C.orange, cursor: 'pointer',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>+</span> Agregar Mes
        </button>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', boxShadow: C.shadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Selecciona el mes a agregar
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {available.map(m => (
              <button key={m} onClick={() => { onAdd(m); setOpen(false) }} style={{
                border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 16px',
                background: C.listBg, color: C.text, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
                {m}
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: C.textMt, background: 'none', border: 'none', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main module ──────────────────────────────────────────────────────────────

export function ControlModule({ data }: { data: ControlData }) {
  const [allEdits,    setAllEdits]    = useState<Record<string, MonthEdits>>({})
  const [extraMonths, setExtraMonths] = useState<string[]>([])

  useEffect(() => {
    setAllEdits(loadEdits())
    setExtraMonths(loadExtra())
  }, [])

  const handleSave = useCallback((mes: string, edits: MonthEdits) => {
    setAllEdits(prev => {
      const next = { ...prev, [mes]: edits }
      saveEdits(next)
      return next
    })
  }, [])

  const addMonth = (mes: string) => {
    const next = [...extraMonths, mes]
    setExtraMonths(next)
    saveExtra(next)
    // Initialize with empty edits
    setAllEdits(prev => {
      const next2 = { ...prev, [mes]: {} }
      saveEdits(next2)
      return next2
    })
  }

  const deleteMonth = (mes: string) => {
    const next = extraMonths.filter(m => m !== mes)
    setExtraMonths(next)
    saveExtra(next)
  }

  const existingMesNames = data.months.map(m => m.mes)
  const allMesNames = [...existingMesNames, ...extraMonths]

  // Derivar resumen desde CURSADO-INGRESADO (más fiable que hoja RESUMEN para meses en curso)
  const summaryFromMonths = data.months.map(m => ({
    mes: m.mes,
    facturado: m.resumenFacturado,
    ingreso:   m.resumenIngresoCaja,
  }))
  const totalsFromMonths = {
    facturado: summaryFromMonths.some(m => m.facturado !== null)
      ? summaryFromMonths.reduce((s, m) => s + (m.facturado ?? 0), 0) : null,
    ingreso:   summaryFromMonths.some(m => m.ingreso !== null)
      ? summaryFromMonths.reduce((s, m) => s + (m.ingreso ?? 0), 0) : null,
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: C.canvas }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Control Mensual 2026</h1>
          {data.lastUpdate && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMt }}>Última actualización: {data.lastUpdate}</p>
          )}
        </div>

        {summaryFromMonths.length > 0 && <SummaryTable summary={summaryFromMonths} totals={totalsFromMonths} />}

        {/* Section label */}
        {(data.months.length > 0 || extraMonths.length > 0) && (
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: C.textMt, marginBottom: 14 }}>
            Detalle por Mes
          </div>
        )}

        {/* Excel months */}
        {data.months.map(month => (
          <MonthCard
            key={month.mes}
            mes={month.mes}
            month={month}
            edits={allEdits[month.mes] ?? {}}
            onSave={e => handleSave(month.mes, e)}
          />
        ))}

        {/* User-added months */}
        {extraMonths.map(mes => (
          <MonthCard
            key={mes}
            mes={mes}
            month={null}
            edits={allEdits[mes] ?? {}}
            onSave={e => handleSave(mes, e)}
            onDelete={() => deleteMonth(mes)}
          />
        ))}

        {/* Add month button */}
        <AddMonthPanel existingMonths={allMesNames} onAdd={addMonth} />

        {data.summary.length === 0 && data.months.length === 0 && extraMonths.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>◈</span>
            <p style={{ color: C.textMt, fontSize: 14 }}>No se encontraron datos en el archivo de control.</p>
          </div>
        )}
      </div>
    </div>
  )
}
