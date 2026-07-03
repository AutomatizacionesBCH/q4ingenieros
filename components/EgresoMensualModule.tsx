'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

// ─── Tokens ───────────────────────────────────────────────────────────────────
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
  green:   '#16A34A',
  greenL:  '#F0FDF4',
  warn:    '#CA8A04',
  warnL:   '#FEFCE8',
  listBg:  '#F8FAFC',
  editBg:  '#FFFBEB',
  shadow:  '0 2px 10px rgba(0,0,0,0.07)',
} as const

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem  { project: string; amount: number | null }
interface EditItem  { id: string; project: string; amount: string }

interface MonthEdits {
  proyeccionItems?: LineItem[]
  pagadosItems?:    LineItem[]
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const KEY_EDITS = 'egreso_edits_v1'
const KEY_EXTRA = 'egreso_extra_months_v1'

function loadEdits(): Record<string, MonthEdits> {
  try { return JSON.parse(localStorage.getItem(KEY_EDITS) ?? '{}') } catch { return {} }
}
function saveEditsLocal(e: Record<string, MonthEdits>) { localStorage.setItem(KEY_EDITS, JSON.stringify(e)) }
function loadExtra(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY_EXTRA) ?? '[]') } catch { return [] }
}
function saveExtraLocal(e: string[]) { localStorage.setItem(KEY_EXTRA, JSON.stringify(e)) }

// ─── Utils ────────────────────────────────────────────────────────────────────
let _seq = 0
const uid = () => `e${++_seq}`

function fmtCLP(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
}

// Formato chileno: '.' es separador de miles, ',' es separador decimal.
// Hay que quitar los puntos ANTES de convertir la coma, o "120.000.000" se
// trunca a 120 (parseFloat corta al segundo punto). Mismo patrón ya usado
// en ProyectosModule.tsx para los inputs de dinero.
function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? null : n
}

function toEditItems(items: LineItem[]): EditItem[] {
  return items.map(it => ({ id: uid(), project: it.project, amount: it.amount != null ? String(it.amount) : '' }))
}

const ALL_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      display: 'flex', flexDirection: 'column',
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

function ItemRow({ label, amount, last }: { label: string; amount: number | null; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingBottom: last ? 0 : 5, borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <span style={{ fontSize: 11, color: C.text, flex: 1, minWidth: 0 }}>{label || <em style={{ color: C.textMt }}>—</em>}</span>
      <span style={{ fontSize: 11, color: C.textSec, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtCLP(amount)}</span>
    </div>
  )
}

function EditRow({ item, onEdit, onRemove }: {
  item: EditItem
  onEdit: (field: string, val: string) => void
  onRemove: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input value={item.project} onChange={e => onEdit('project', e.target.value)}
        placeholder="Descripción" style={{ flex: 1, minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 7px', fontSize: 11, background: C.editBg, color: C.text, outline: 'none' }} />
      <input value={item.amount} onChange={e => onEdit('amount', e.target.value)}
        placeholder="Monto" style={{ width: 90, border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 7px', fontSize: 11, fontVariantNumeric: 'tabular-nums', background: C.editBg, color: C.text, outline: 'none' }} />
      <button onClick={onRemove} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 16, padding: '0 3px', lineHeight: 1 }}>×</button>
    </div>
  )
}

function AddBtn({ accent, onClick }: { accent: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ border: `1px dashed ${accent}`, borderRadius: 5, padding: '4px 0', fontSize: 9, color: accent, background: 'transparent', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', width: '100%' }}>
      + Agregar
    </button>
  )
}

function TotalLine({ label, value, color, big }: { label: string; value: number | null; color: string; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: C.textSec }}>{label}</span>
      <span style={{ fontSize: big ? 15 : 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(value)}</span>
    </div>
  )
}

// ─── Month card ───────────────────────────────────────────────────────────────

interface Draft { proyItems: EditItem[]; pagItems: EditItem[] }

function MonthCard({ mes, edits, onSave, onDelete }: {
  mes:      string
  edits:    MonthEdits
  onSave:   (e: MonthEdits) => void
  onDelete: () => void
}) {
  const isMobile = useIsMobile()
  const hasData  = !!(edits.proyeccionItems?.length || edits.pagadosItems?.length)

  const [editing, setEditing] = useState(!hasData)
  const [draft,   setDraft]   = useState<Draft | null>(
    !hasData ? { proyItems: [], pagItems: [] } : null
  )

  const startEdit = () => {
    setDraft({
      proyItems: toEditItems(edits.proyeccionItems ?? []),
      pagItems:  toEditItems(edits.pagadosItems    ?? []),
    })
    setEditing(true)
  }

  const save = () => {
    if (!draft) return
    const filteredProy = draft.proyItems.filter(it => it.project || it.amount)
    const filteredPag  = draft.pagItems.filter(it => it.project || it.amount)
    onSave({
      proyeccionItems: filteredProy.map(it => ({ project: it.project, amount: parseNum(it.amount) })),
      pagadosItems:    filteredPag.map(it =>  ({ project: it.project, amount: parseNum(it.amount) })),
    })
    setDraft(null)
    setEditing(false)
  }

  // Draft helpers
  const updProy = (fn: (l: EditItem[]) => EditItem[]) => setDraft(d => d ? { ...d, proyItems: fn(d.proyItems) } : d)
  const updPag  = (fn: (l: EditItem[]) => EditItem[]) => setDraft(d => d ? { ...d, pagItems:  fn(d.pagItems)  } : d)
  const editProy = (id: string, f: string, v: string) => updProy(l => l.map(it => it.id === id ? { ...it, [f]: v } : it))
  const editPag  = (id: string, f: string, v: string) => updPag(l  => l.map(it => it.id === id ? { ...it, [f]: v } : it))
  const rmProy   = (id: string) => updProy(l => l.filter(it => it.id !== id))
  const rmPag    = (id: string) => updPag(l  => l.filter(it => it.id !== id))
  const addProy  = () => updProy(l => [...l, { id: uid(), project: '', amount: '' }])
  const addPag   = () => updPag(l  => [...l, { id: uid(), project: '', amount: '' }])

  // Display items
  const proyItems = editing && draft ? draft.proyItems : toEditItems(edits.proyeccionItems ?? [])
  const pagItems  = editing && draft ? draft.pagItems  : toEditItems(edits.pagadosItems    ?? [])

  const totalProy = proyItems.reduce((s, it) => s + (parseNum(it.amount) ?? 0), 0)
  const totalPag  = pagItems.reduce((s, it)  => s + (parseNum(it.amount) ?? 0), 0)
  const diff      = totalPag - totalProy  // negativo = gastó menos de lo proyectado

  return (
    <div style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden', marginBottom: 18 }}>

      {/* Header */}
      <div style={{ background: editing ? C.orange : C.navy, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{mes}</span>
          {!hasData && !editing && (
            <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>NUEVO</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              {hasData && (
                <button onClick={() => { setDraft(null); setEditing(false) }} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  Cancelar
                </button>
              )}
              <button onClick={save} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, border: 'none', background: '#fff', color: C.orange, cursor: 'pointer', fontWeight: 800 }}>
                Guardar
              </button>
            </>
          ) : (
            <>
              <button onClick={onDelete} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600 }}>
                Eliminar
              </button>
              <button onClick={startEdit} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>✏</span> Editar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, padding: isMobile ? '12px' : '16px 18px' }}>

        {/* Proyección */}
        <Box accent={C.warn} title="Proyección de Egresos" editing={editing}>
          {editing && draft ? (
            <>
              {draft.proyItems.map(it => (
                <EditRow key={it.id} item={it} onRemove={() => rmProy(it.id)} onEdit={(f, v) => editProy(it.id, f, v)} />
              ))}
              <AddBtn accent={C.warn} onClick={addProy} />
            </>
          ) : (
            <>
              {proyItems.map((it, i) => (
                <ItemRow key={it.id} label={it.project} amount={parseNum(it.amount)} last={i === proyItems.length - 1} />
              ))}
              {proyItems.length === 0 && <span style={{ fontSize: 11, color: C.textMt, fontStyle: 'italic' }}>Sin registros</span>}
            </>
          )}
          <Divider />
          <TotalLine label="Total proyectado" value={totalProy || null} color={C.warn} big />
        </Box>

        {/* Pagado */}
        <Box accent={C.green} title="Egresos Pagados" editing={editing}>
          {editing && draft ? (
            <>
              {draft.pagItems.map(it => (
                <EditRow key={it.id} item={it} onRemove={() => rmPag(it.id)} onEdit={(f, v) => editPag(it.id, f, v)} />
              ))}
              <AddBtn accent={C.green} onClick={addPag} />
            </>
          ) : (
            <>
              {pagItems.map((it, i) => (
                <ItemRow key={it.id} label={it.project} amount={parseNum(it.amount)} last={i === pagItems.length - 1} />
              ))}
              {pagItems.length === 0 && <span style={{ fontSize: 11, color: C.textMt, fontStyle: 'italic' }}>Sin registros</span>}
            </>
          )}
          <Divider />
          <TotalLine label="Total pagado" value={totalPag || null} color={C.green} big />
          {totalProy > 0 && totalPag > 0 && (
            <div style={{ fontSize: 10, color: diff <= 0 ? C.green : '#DC2626', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {diff <= 0 ? `▼ ${fmtCLP(Math.abs(diff))} bajo proyección` : `▲ ${fmtCLP(diff)} sobre proyección`}
            </div>
          )}
        </Box>

      </div>
    </div>
  )
}

// ─── Add month panel ──────────────────────────────────────────────────────────

function AddMonthPanel({ existing, onAdd }: { existing: string[]; onAdd: (m: string) => void }) {
  const [open, setOpen] = useState(false)
  const available = ALL_MONTHS.filter(m => !existing.includes(m))
  if (available.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          width: '100%', border: `2px dashed ${C.orange}`, borderRadius: 12, padding: 14,
          background: C.orangeL, color: C.orange, cursor: 'pointer',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>+</span> Agregar Mes
        </button>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', boxShadow: C.shadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Selecciona el mes
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

export function EgresoMensualModule() {
  const isMobile = useIsMobile()
  const [allEdits,    setAllEdits]    = useState<Record<string, MonthEdits>>({})
  const [extraMonths, setExtraMonths] = useState<string[]>([])
  const [saveError,   setSaveError]   = useState(false)
  // Se pone en true en cuanto el usuario guarda algo. Evita que el fetch de
  // hidratación inicial (que puede resolver tarde) pise con datos viejos de
  // Supabase un guardado que ya ocurrió — bug real: el cliente escribía un
  // egreso, guardaba, y esa respuesta tardía lo hacía desaparecer.
  const hasLocalEditRef = useRef(false)

  // ── Load: Supabase primero, localStorage fallback ─────────────────────────
  useEffect(() => {
    setAllEdits(loadEdits())
    setExtraMonths(loadExtra())
    fetch('/api/egreso-edits')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        if (hasLocalEditRef.current) return // ya se guardó algo más nuevo, no pisarlo
        if (Object.keys(data.edits).length > 0 || data.extraMonths.length > 0) {
          setAllEdits(data.edits)
          setExtraMonths(data.extraMonths)
          saveEditsLocal(data.edits)
          saveExtraLocal(data.extraMonths)
        }
      })
      .catch(() => {})
  }, [])

  // ── Persist: localStorage + Supabase ─────────────────────────────────────
  // Se verifica r.ok — si Supabase falla (ej. tabla inexistente) no se debe
  // asumir que quedó sincronizado; solo vive en este navegador y hay que avisar.
  const persistAll = useCallback((edits: Record<string, MonthEdits>, extra: string[]) => {
    hasLocalEditRef.current = true
    saveEditsLocal(edits)
    saveExtraLocal(extra)
    fetch('/api/egreso-edits', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ edits, extraMonths: extra }),
    }).then(r => setSaveError(!r.ok))
      .catch(() => setSaveError(true))
  }, [])

  const handleSave = useCallback((mes: string, edits: MonthEdits) => {
    setAllEdits(prev => {
      const next = { ...prev, [mes]: edits }
      persistAll(next, extraMonths)
      return next
    })
  }, [extraMonths, persistAll])

  const addMonth = (mes: string) => {
    const nextExtra = [...extraMonths, mes]
    setExtraMonths(nextExtra)
    setAllEdits(prev => {
      const next = { ...prev, [mes]: {} }
      persistAll(next, nextExtra)
      return next
    })
  }

  const deleteMonth = (mes: string) => {
    const nextExtra = extraMonths.filter(m => m !== mes)
    setExtraMonths(nextExtra)
    setAllEdits(prev => {
      persistAll(prev, nextExtra)
      return prev
    })
  }

  // ── Totales globales ──────────────────────────────────────────────────────
  const totalProy = extraMonths.reduce((s, mes) => {
    const items = allEdits[mes]?.proyeccionItems ?? []
    return s + items.reduce((a, it) => a + (it.amount ?? 0), 0)
  }, 0)

  const totalPag = extraMonths.reduce((s, mes) => {
    const items = allEdits[mes]?.pagadosItems ?? []
    return s + items.reduce((a, it) => a + (it.amount ?? 0), 0)
  }, 0)

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: C.canvas }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '16px 12px 32px' : '24px 24px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Egreso Mensual 2026</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMt }}>Proyección vs egresos reales por mes</p>
          </div>
          {saveError && (
            <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '3px 9px' }}>
              ⚠ No se pudo guardar en la nube — los cambios quedaron solo en este navegador
            </span>
          )}
        </div>

        {/* Summary table */}
        {extraMonths.length > 0 && (
          <div style={{ background: C.navy, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden', marginBottom: 28 }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)' }}>MES</span>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ADE80', textAlign: 'right' }}>EGRESO PAGADO</span>
            </div>
            {/* Rows */}
            {extraMonths.map((mes, i) => {
              const pagado = (allEdits[mes]?.pagadosItems ?? []).reduce((s, it) => s + (it.amount ?? 0), 0)
              return (
                <div key={mes} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  padding: '11px 20px',
                  borderBottom: i < extraMonths.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#F0EDE8' }}>{mes}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: pagado > 0 ? '#4ADE80' : 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                    {pagado > 0 ? fmtCLP(pagado) : '—'}
                  </span>
                </div>
              )
            })}
            {/* Total footer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '12px 20px', background: 'rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.6)' }}>TOTAL Q4</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#4ADE80', fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(totalPag || null)}</span>
            </div>
          </div>
        )}

        {/* Section label */}
        {extraMonths.length > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: C.textMt, marginBottom: 14 }}>
            Detalle por Mes
          </div>
        )}

        {/* Month cards */}
        {extraMonths.map(mes => (
          <MonthCard
            key={mes}
            mes={mes}
            edits={allEdits[mes] ?? {}}
            onSave={e => handleSave(mes, e)}
            onDelete={() => deleteMonth(mes)}
          />
        ))}

        <AddMonthPanel existing={extraMonths} onAdd={addMonth} />

        {extraMonths.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>◈</span>
            <p style={{ color: C.textMt, fontSize: 14 }}>Agrega el primer mes para comenzar.</p>
          </div>
        )}

      </div>
    </div>
  )
}
