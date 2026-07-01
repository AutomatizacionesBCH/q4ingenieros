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
  blue:    '#2563EB',
  blueL:   '#EFF6FF',
  listBg:  '#F8FAFC',
  editBg:  '#FFFBEB',
  shadow:  '0 2px 10px rgba(0,0,0,0.07)',
} as const

// ─── Types ────────────────────────────────────────────────────────────────────
interface Column { id: string; label: string }
interface Row     { id: string; values: Record<string, string> }
interface Week    { id: string; label: string; columns: Column[]; rows: Row[] }
interface MonthData { weeks: Week[] }

// ─── Storage ──────────────────────────────────────────────────────────────────
const KEY_EDITS = 'reporte_avance_edits_v1'
const KEY_EXTRA = 'reporte_avance_months_v1'

function loadEdits(): Record<string, MonthData> {
  try { return JSON.parse(localStorage.getItem(KEY_EDITS) ?? '{}') } catch { return {} }
}
function saveEditsLocal(e: Record<string, MonthData>) { localStorage.setItem(KEY_EDITS, JSON.stringify(e)) }
function loadExtra(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY_EXTRA) ?? '[]') } catch { return [] }
}
function saveExtraLocal(e: string[]) { localStorage.setItem(KEY_EXTRA, JSON.stringify(e)) }

// ─── Utils ────────────────────────────────────────────────────────────────────
let _seq = 0
const uid = () => `r${++_seq}`

const ALL_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const DEFAULT_COLUMNS: Column[] = [
  { id: uid(), label: 'N° Proyecto' },
  { id: uid(), label: 'Nombre' },
  { id: uid(), label: 'Proyectista' },
  { id: uid(), label: 'Estado' },
]

function emptyRow(columns: Column[]): Row {
  const values: Record<string, string> = {}
  columns.forEach(c => { values[c.id] = '' })
  return { id: uid(), values }
}

function newWeek(label: string): Week {
  const columns = DEFAULT_COLUMNS.map(c => ({ id: uid(), label: c.label }))
  const rows = Array.from({ length: 6 }, () => emptyRow(columns))
  return { id: uid(), label, columns, rows }
}

// ─── Editable cell ────────────────────────────────────────────────────────────

function Cell({ value, onChange, placeholder, bold }: { value: string; onChange: (v: string) => void; placeholder?: string; bold?: boolean }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', border: 'none', outline: 'none', background: 'transparent',
        padding: '8px 10px', fontSize: 13, color: C.text, fontWeight: bold ? 700 : 400,
        fontFamily: 'inherit',
      }}
    />
  )
}

// ─── Week block ───────────────────────────────────────────────────────────────

function WeekBlock({ week, onChange, onDelete }: {
  week:     Week
  onChange: (w: Week) => void
  onDelete: () => void
}) {
  const updateLabel = (label: string) => onChange({ ...week, label })

  const updateColLabel = (colId: string, label: string) =>
    onChange({ ...week, columns: week.columns.map(c => c.id === colId ? { ...c, label } : c) })

  const addColumn = () => {
    const col: Column = { id: uid(), label: '' }
    onChange({
      ...week,
      columns: [...week.columns, col],
      rows: week.rows.map(r => ({ ...r, values: { ...r.values, [col.id]: '' } })),
    })
  }

  const removeColumn = (colId: string) => {
    if (week.columns.length <= 1) return
    onChange({
      ...week,
      columns: week.columns.filter(c => c.id !== colId),
      rows: week.rows.map(r => {
        const values = { ...r.values }
        delete values[colId]
        return { ...r, values }
      }),
    })
  }

  const updateCell = (rowId: string, colId: string, value: string) =>
    onChange({ ...week, rows: week.rows.map(r => r.id === rowId ? { ...r, values: { ...r.values, [colId]: value } } : r) })

  const addRow = () => onChange({ ...week, rows: [...week.rows, emptyRow(week.columns)] })

  const removeRow = (rowId: string) => {
    if (week.rows.length <= 1) return
    onChange({ ...week, rows: week.rows.filter(r => r.id !== rowId) })
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
      {/* Week header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.listBg, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Semana</span>
        <input
          value={week.label}
          onChange={e => updateLabel(e.target.value)}
          placeholder="ej. 22/06"
          style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 9px', fontSize: 12, fontWeight: 700, color: C.text, background: C.card, outline: 'none', width: 110 }}
        />
        <div style={{ flex: 1 }} />
        <button onClick={onDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.textMt, fontSize: 11, fontWeight: 600 }}>
          Eliminar semana
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr>
              {week.columns.map(col => (
                <th key={col.id} style={{ background: C.blue, padding: '4px 4px 4px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      value={col.label}
                      onChange={e => updateColLabel(col.id, e.target.value)}
                      placeholder="Columna"
                      style={{
                        flex: 1, minWidth: 60, border: 'none', outline: 'none', background: 'transparent',
                        padding: '6px 0', fontSize: 10, fontWeight: 800, color: '#fff',
                        textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit',
                      }}
                    />
                    {week.columns.length > 1 && (
                      <button onClick={() => removeColumn(col.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1, padding: '0 4px' }}>
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ background: C.blue, width: 36, padding: 0 }}>
                <button onClick={addColumn} title="Agregar columna" style={{ width: '100%', height: '100%', border: 'none', background: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, fontWeight: 800, padding: '6px 0' }}>
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {week.rows.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 0 ? C.card : '#FAFBFD' }}>
                {week.columns.map(col => (
                  <td key={col.id} style={{ borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
                    <Cell value={row.values[col.id] ?? ''} onChange={v => updateCell(row.id, col.id, v)} />
                  </td>
                ))}
                <td style={{ borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>
                  {week.rows.length > 1 && (
                    <button onClick={() => removeRow(row.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 15, lineHeight: 1, padding: '4px' }}>
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '8px 10px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={addRow} style={{ border: `1px dashed ${C.blue}`, borderRadius: 5, padding: '5px 0', fontSize: 9, color: C.blue, background: 'transparent', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', width: '100%' }}>
          + Agregar fila
        </button>
      </div>
    </div>
  )
}

// ─── Month card ───────────────────────────────────────────────────────────────

function MonthCard({ mes, data, onChange, onDelete }: {
  mes:      string
  data:     MonthData
  onChange: (d: MonthData) => void
  onDelete: () => void
}) {
  const weeks = data.weeks ?? []

  const addWeek = () => onChange({ weeks: [...weeks, newWeek('')] })
  const updateWeek = (weekId: string, w: Week) => onChange({ weeks: weeks.map(x => x.id === weekId ? w : x) })
  const deleteWeek = (weekId: string) => onChange({ weeks: weeks.filter(x => x.id !== weekId) })

  return (
    <div style={{ background: C.card, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden', marginBottom: 22 }}>

      {/* Month header */}
      <div style={{ background: C.navy, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{mes}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onDelete} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600 }}>
            Eliminar mes
          </button>
          <button onClick={addWeek} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', background: C.orange, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            + Semana
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {weeks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <span style={{ fontSize: 12, color: C.textMt, fontStyle: 'italic' }}>Sin semanas — agrega la primera</span>
          </div>
        )}
        {weeks.map(w => (
          <WeekBlock key={w.id} week={w} onChange={updated => updateWeek(w.id, updated)} onDelete={() => deleteWeek(w.id)} />
        ))}
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

export function AvanceSemanalModule() {
  const isMobile = useIsMobile()
  const [allData,     setAllData]     = useState<Record<string, MonthData>>({})
  const [extraMonths, setExtraMonths] = useState<string[]>([])
  const [savedTag,     setSavedTag]   = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load: localStorage inmediato, Supabase como fuente de verdad ──────────
  useEffect(() => {
    setAllData(loadEdits())
    setExtraMonths(loadExtra())
    fetch('/api/reporte-avance-edits')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        if (Object.keys(data.edits).length > 0 || data.extraMonths.length > 0) {
          setAllData(data.edits)
          setExtraMonths(data.extraMonths)
          saveEditsLocal(data.edits)
          saveExtraLocal(data.extraMonths)
        }
      })
      .catch(() => {})
  }, [])

  // ── Persist: localStorage inmediato, Supabase con debounce ───────────────
  const persist = useCallback((data: Record<string, MonthData>, extra: string[]) => {
    saveEditsLocal(data)
    saveExtraLocal(extra)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/reporte-avance-edits', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ edits: data, extraMonths: extra }),
      }).then(() => {
        setSavedTag(true)
        setTimeout(() => setSavedTag(false), 1500)
      }).catch(() => {})
    }, 700)
  }, [])

  const handleMonthChange = useCallback((mes: string, monthData: MonthData) => {
    setAllData(prev => {
      const next = { ...prev, [mes]: monthData }
      persist(next, extraMonths)
      return next
    })
  }, [extraMonths, persist])

  const addMonth = (mes: string) => {
    const nextExtra = [...extraMonths, mes]
    setExtraMonths(nextExtra)
    setAllData(prev => {
      const next = { ...prev, [mes]: { weeks: [newWeek('')] } }
      persist(next, nextExtra)
      return next
    })
  }

  const deleteMonth = (mes: string) => {
    const nextExtra = extraMonths.filter(m => m !== mes)
    setExtraMonths(nextExtra)
    setAllData(prev => {
      persist(prev, nextExtra)
      return prev
    })
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: C.canvas }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 12px 32px' : '24px 24px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Avance Semanal Proyectos</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMt }}>Reportería — seguimiento semanal por mes</p>
          </div>
          {savedTag && (
            <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>✓ Guardado</span>
          )}
        </div>

        {extraMonths.map(mes => (
          <MonthCard
            key={mes}
            mes={mes}
            data={allData[mes] ?? { weeks: [] }}
            onChange={d => handleMonthChange(mes, d)}
            onDelete={() => deleteMonth(mes)}
          />
        ))}

        <AddMonthPanel existing={extraMonths} onAdd={addMonth} />

        {extraMonths.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>▦</span>
            <p style={{ color: C.textMt, fontSize: 14 }}>Agrega el primer mes para comenzar.</p>
          </div>
        )}

      </div>
    </div>
  )
}
