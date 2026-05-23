'use client'

/**
 * components/ControlPendienteModule.tsx — Control Pendiente Histórico (Client Component)
 */

import { useState, useEffect } from 'react'
import type { ControlData, TipoPendiente } from '@/lib/control-parser'
import { useIsMobile } from '@/hooks/useIsMobile'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  canvas:  '#F0F2F6',
  card:    '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F1A2E',
  textSec: '#64748B',
  textMt:  '#94A3B8',
  orange:  '#E5501E',
  orangeL: '#FFF5F2',
  navy:    '#0F1A2E',
  blue:    '#0284C7',
  pub:     '#2563EB',
  pubL:    '#EFF6FF',
  priv:    '#7C3AED',
  privL:   '#F5F3FF',
  amber:   '#D97706',
  amberL:  '#FFFBEB',
  editBg:  '#FFFBEB',
  shadow:  '0 2px 10px rgba(0,0,0,0.07)',
} as const

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmtCLP(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(v)
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.,]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

let _seq = 0
const uid = () => `p${++_seq}`

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ctrl_pend_v1'

interface StoredItem {
  project: string
  amount: number | null
  tipo: TipoPendiente
}
interface Stored { pub: StoredItem[]; priv: StoredItem[] }

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch { return null }
}

function saveStored(data: Stored): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ─── Item edit type ───────────────────────────────────────────────────────────

interface ItemEdit {
  id: string
  project: string
  amount: string
  tipo: TipoPendiente
}

function fromStored(items: StoredItem[]): ItemEdit[] {
  return items.map(it => ({
    id: uid(),
    project: it.project,
    amount: it.amount != null ? String(it.amount) : '',
    tipo: it.tipo,
  }))
}

function toStored(items: ItemEdit[]): StoredItem[] {
  return items
    .filter(it => it.project.trim() || it.amount.trim())
    .map(it => ({ project: it.project, amount: parseNum(it.amount), tipo: it.tipo }))
}

// ─── Summary cards (computed from items) ─────────────────────────────────────

function SummaryCards({
  pubNoFac, pubFacNoCob, pubTotal,
  privNoFac, privBoletas, privTotal,
  isMobile,
}: {
  pubNoFac: number; pubFacNoCob: number; pubTotal: number
  privNoFac: number; privBoletas: number; privTotal: number
  isMobile: boolean
}) {
  const StatLine = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 11, color: C.textSec }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 28 }}>

      {/* Público */}
      <div style={{ background: C.card, borderRadius: 12, boxShadow: C.shadow, overflow: 'hidden' }}>
        <div style={{ background: C.pub, padding: '12px 18px' }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Público — Pendiente
          </span>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <StatLine label="No Facturado"            value={fmtCLP(pubNoFac || null)}    color={C.text} />
          <StatLine label="Facturado / No Cobrado"  value={fmtCLP(pubFacNoCob || null)} color={C.amber} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.pub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total pendiente</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.pub, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(pubTotal || null)}</span>
          </div>
        </div>
      </div>

      {/* Privado */}
      <div style={{ background: C.card, borderRadius: 12, boxShadow: C.shadow, overflow: 'hidden' }}>
        <div style={{ background: C.priv, padding: '12px 18px' }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Privado — Pendiente
          </span>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <StatLine label="No Facturado"      value={fmtCLP(privNoFac || null)}   color={C.text} />
          <StatLine label="Boletas por Cursar" value={fmtCLP(privBoletas || null)} color={C.textSec} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.priv, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total pendiente</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.priv, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(privTotal || null)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── View row ─────────────────────────────────────────────────────────────────

function ViewRow({ project, amount, last }: { project: string; amount: number | null; last: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 8,
      padding: '5px 0',
      borderBottom: last ? 'none' : `1px solid ${C.border}`,
    }}>
      <span style={{
        fontSize: 11, color: C.text, flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {project || <em style={{ color: C.textMt }}>—</em>}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {fmtCLP(amount)}
      </span>
    </div>
  )
}

// ─── Edit row ─────────────────────────────────────────────────────────────────

function EditRow({ item, tipoOne, tipoTwo, tipoOneBadge, tipoTwoBadge, onEdit, onRemove }: {
  item: ItemEdit
  tipoOne: TipoPendiente
  tipoTwo: TipoPendiente
  tipoOneBadge: string
  tipoTwoBadge: string
  onEdit: (field: 'project' | 'amount' | 'tipo', value: string) => void
  onRemove: () => void
}) {
  const isOne = item.tipo === tipoOne
  const activeOneColor = C.pub
  const activeTwoColor = C.amber
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
      {/* Tipo toggle */}
      <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button
          onClick={() => onEdit('tipo', tipoOne)}
          style={{ fontSize: 8, padding: '3px 6px', border: 'none', cursor: 'pointer', fontWeight: 800, letterSpacing: '0.03em',
            background: isOne ? activeOneColor : '#F1F5F9',
            color: isOne ? '#fff' : C.textMt,
          }}
        >{tipoOneBadge}</button>
        <button
          onClick={() => onEdit('tipo', tipoTwo)}
          style={{ fontSize: 8, padding: '3px 6px', border: 'none', cursor: 'pointer', fontWeight: 800, letterSpacing: '0.03em',
            background: !isOne ? activeTwoColor : '#F1F5F9',
            color: !isOne ? '#fff' : C.textMt,
          }}
        >{tipoTwoBadge}</button>
      </div>
      <input
        value={item.project}
        onChange={e => onEdit('project', e.target.value)}
        placeholder="Proyecto"
        style={{ flex: 1, minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 6px', fontSize: 10, background: C.editBg, color: C.text, outline: 'none' }}
      />
      <input
        value={item.amount}
        onChange={e => onEdit('amount', e.target.value)}
        placeholder="Monto"
        style={{ width: 88, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 6px', fontSize: 10, fontVariantNumeric: 'tabular-nums', background: C.editBg, color: C.text, outline: 'none' }}
      />
      <button onClick={onRemove} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>
        ×
      </button>
    </div>
  )
}

// ─── Section chip ─────────────────────────────────────────────────────────────

function SectionChip({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em',
      color, background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: 4, padding: '3px 8px',
      marginBottom: 6, marginTop: 2,
    }}>
      {label}
    </div>
  )
}

// ─── Pendiente table ──────────────────────────────────────────────────────────

interface TableProps {
  title: string
  headerColor: string
  items: ItemEdit[]
  onSave: (items: ItemEdit[]) => void
  sectionOneLabel: string
  sectionTwoLabel: string
  sectionOneTipo: TipoPendiente
  sectionTwoTipo: TipoPendiente
  sectionOneBadge: string
  sectionTwoBadge: string
}

function PendienteTable({
  title, headerColor, items, onSave,
  sectionOneLabel, sectionTwoLabel,
  sectionOneTipo, sectionTwoTipo,
  sectionOneBadge, sectionTwoBadge,
}: TableProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ItemEdit[]>([])
  const hasEdits = items.length > 0

  const startEdit = () => {
    setDraft(items.map(it => ({ ...it })))
    setEditing(true)
  }
  const cancel = () => { setDraft([]); setEditing(false) }
  const save = () => {
    const kept = draft.filter(it => it.project.trim() || it.amount.trim())
    onSave(kept)
    setEditing(false)
  }

  const editItem = (id: string, field: 'project' | 'amount' | 'tipo', value: string) =>
    setDraft(d => d.map(it => it.id === id ? { ...it, [field]: value } : it))
  const removeItem = (id: string) => setDraft(d => d.filter(it => it.id !== id))
  const addItem = (tipo: TipoPendiente) =>
    setDraft(d => [...d, { id: uid(), project: '', amount: '', tipo }])

  const display = editing ? draft : items
  const secOne = display.filter(it => it.tipo === sectionOneTipo)
  const secTwo = display.filter(it => it.tipo === sectionTwoTipo)

  const totalOne = secOne.reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const totalTwo = secTwo.reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const grandTotal = totalOne + totalTwo

  const secTwoColor = sectionTwoTipo === 'facNoCob' ? C.amber : C.textSec

  return (
    <div style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        background: editing ? C.orange : headerColor,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            {title}
          </span>
          {hasEdits && !editing && (
            <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
              {items.length} proyectos
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button onClick={cancel} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={save} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, border: 'none', background: '#fff', color: C.orange, cursor: 'pointer', fontWeight: 800 }}>
                Guardar
              </button>
            </>
          ) : (
            <button onClick={startEdit} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              ✏ Editar
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0 20px 20px' }}>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '10px 0 6px', borderBottom: `2px solid ${C.border}` }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proyecto</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monto a Recibir</span>
        </div>

        {/* ── Section 1: No Facturado ── */}
        <div style={{ marginTop: 12 }}>
          <SectionChip label={sectionOneLabel} color={headerColor} />

          {editing ? (
            <>
              {draft.filter(it => it.tipo === sectionOneTipo).map(it => (
                <EditRow key={it.id} item={it}
                  tipoOne={sectionOneTipo} tipoTwo={sectionTwoTipo}
                  tipoOneBadge={sectionOneBadge} tipoTwoBadge={sectionTwoBadge}
                  onEdit={(f, v) => editItem(it.id, f, v)}
                  onRemove={() => removeItem(it.id)}
                />
              ))}
              <button
                onClick={() => addItem(sectionOneTipo)}
                style={{ border: `1px dashed ${headerColor}`, borderRadius: 4, padding: '3px 0', fontSize: 9, color: headerColor, background: 'transparent', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', width: '100%', marginBottom: 4 }}
              >
                + Agregar en {sectionOneLabel}
              </button>
            </>
          ) : (
            secOne.length === 0
              ? <span style={{ fontSize: 10, color: C.textMt, fontStyle: 'italic', display: 'block', padding: '3px 0 6px' }}>Sin registros</span>
              : secOne.map((it, i) => (
                <ViewRow key={it.id} project={it.project} amount={parseNum(it.amount)} last={i === secOne.length - 1} />
              ))
          )}

          {totalOne > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, paddingBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: headerColor, fontVariantNumeric: 'tabular-nums' }}>
                {fmtCLP(totalOne)}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, margin: '10px 0' }} />

        {/* ── Section 2: Facturado/No Cobrado or Boletas ── */}
        <div>
          <SectionChip label={sectionTwoLabel} color={secTwoColor} />

          {editing ? (
            <>
              {draft.filter(it => it.tipo === sectionTwoTipo).map(it => (
                <EditRow key={it.id} item={it}
                  tipoOne={sectionOneTipo} tipoTwo={sectionTwoTipo}
                  tipoOneBadge={sectionOneBadge} tipoTwoBadge={sectionTwoBadge}
                  onEdit={(f, v) => editItem(it.id, f, v)}
                  onRemove={() => removeItem(it.id)}
                />
              ))}
              <button
                onClick={() => addItem(sectionTwoTipo)}
                style={{ border: `1px dashed ${secTwoColor}`, borderRadius: 4, padding: '3px 0', fontSize: 9, color: secTwoColor, background: 'transparent', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', width: '100%', marginBottom: 4 }}
              >
                + Agregar en {sectionTwoLabel}
              </button>
            </>
          ) : (
            secTwo.length === 0
              ? <span style={{ fontSize: 10, color: C.textMt, fontStyle: 'italic', display: 'block', padding: '3px 0 6px' }}>Sin registros</span>
              : secTwo.map((it, i) => (
                <ViewRow key={it.id} project={it.project} amount={parseNum(it.amount)} last={i === secTwo.length - 1} />
              ))
          )}

          {totalTwo > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, paddingBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: secTwoColor, fontVariantNumeric: 'tabular-nums' }}>
                {fmtCLP(totalTwo)}
              </span>
            </div>
          )}
        </div>

        {/* Grand total */}
        <div style={{ borderTop: `2px solid ${headerColor}`, marginTop: 14, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Total Pendiente
          </span>
          <span style={{ fontSize: 22, fontWeight: 900, color: headerColor, fontVariantNumeric: 'tabular-nums' }}>
            {fmtCLP(grandTotal || null)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main module ──────────────────────────────────────────────────────────────

export function ControlPendienteModule({ data }: { data: ControlData }) {
  const isMobile = useIsMobile()
  const [pubItems, setPubItems] = useState<ItemEdit[]>([])
  const [privItems, setPrivItems] = useState<ItemEdit[]>([])

  useEffect(() => {
    const saved = loadStored()
    if (saved) {
      setPubItems(fromStored(saved.pub))
      setPrivItems(fromStored(saved.priv))
    } else {
      setPubItems(fromStored(
        data.pendienteDetail.publicoItems.map(it => ({ project: it.project, amount: it.amount, tipo: it.tipo }))
      ))
      setPrivItems(fromStored(
        data.pendienteDetail.privadoItems.map(it => ({ project: it.project, amount: it.amount, tipo: it.tipo }))
      ))
    }
  }, [data])

  const handlePubSave = (items: ItemEdit[]) => {
    setPubItems(items)
    saveStored({ pub: toStored(items), priv: toStored(privItems) })
  }

  const handlePrivSave = (items: ItemEdit[]) => {
    setPrivItems(items)
    saveStored({ pub: toStored(pubItems), priv: toStored(items) })
  }

  // Computed totals for summary cards — live as items change
  const pubNoFac    = pubItems.filter(it => it.tipo === 'noFac').reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const pubFacNoCob = pubItems.filter(it => it.tipo === 'facNoCob').reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const pubTotal    = pubNoFac + pubFacNoCob
  const privNoFac   = privItems.filter(it => it.tipo === 'noFac').reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const privBoletas = privItems.filter(it => it.tipo === 'boletas').reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const privTotal   = privNoFac + privBoletas

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: C.canvas }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: isMobile ? '16px 12px 32px' : '24px 24px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>
            Control Pendiente Histórico
          </h1>
          {data.lastUpdate && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMt }}>
              Última actualización: {data.lastUpdate}
            </p>
          )}
        </div>

        {/* Summary cards — computed live from item state */}
        <SummaryCards
          pubNoFac={pubNoFac} pubFacNoCob={pubFacNoCob} pubTotal={pubTotal}
          privNoFac={privNoFac} privBoletas={privBoletas} privTotal={privTotal}
          isMobile={isMobile}
        />

        {/* Section label */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: C.textMt, marginBottom: 14 }}>
          Detalle de Pendientes
        </div>

        {/* Tables side by side — stack on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
          <PendienteTable
            title="Públicos Pendientes a Facturar"
            headerColor={C.pub}
            items={pubItems}
            onSave={handlePubSave}
            sectionOneLabel="No Facturado"
            sectionTwoLabel="Facturado / No Cobrado"
            sectionOneTipo="noFac"
            sectionTwoTipo="facNoCob"
            sectionOneBadge="NF"
            sectionTwoBadge="FC"
          />
          <PendienteTable
            title="Privados Pendientes a Facturar"
            headerColor={C.priv}
            items={privItems}
            onSave={handlePrivSave}
            sectionOneLabel="No Facturado"
            sectionTwoLabel="Boletas por Cursar"
            sectionOneTipo="noFac"
            sectionTwoTipo="boletas"
            sectionOneBadge="NF"
            sectionTwoBadge="BL"
          />
        </div>

        {/* Empty state */}
        {pubItems.length === 0 && privItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>◉</span>
            <p style={{ color: C.textMt, fontSize: 14 }}>No se encontraron datos de pendientes en el archivo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
