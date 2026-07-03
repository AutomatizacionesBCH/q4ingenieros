'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
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
interface Week    { id: string; label: string; columns: Column[]; rows: Row[]; locked?: boolean }
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
  { id: uid(), label: 'Responsable' },
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
  return { id: uid(), label, columns, rows, locked: false }
}

function nonEmptyRows(week: Week): Row[] {
  return week.rows.filter(r => week.columns.some(c => (r.values[c.id] ?? '').trim() !== ''))
}

// Renombra la columna "Proyectista" (nombre antiguo) a "Responsable" en datos ya guardados
function migrateLabels(data: Record<string, MonthData>): Record<string, MonthData> {
  let changed = false
  const next: Record<string, MonthData> = {}
  for (const [mes, month] of Object.entries(data)) {
    const weeks = (month.weeks ?? []).map(w => {
      const columns = w.columns.map(c => {
        if (c.label.trim().toLowerCase() === 'proyectista') { changed = true; return { ...c, label: 'Responsable' } }
        return c
      })
      return { ...w, columns }
    })
    next[mes] = { ...month, weeks }
  }
  return changed ? next : data
}

// ─── Copy-to-clipboard (rich HTML table, for pasting into email) ────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildWeekHtml(mes: string, week: Week): string {
  const rows = nonEmptyRows(week)
  const thStyle = 'background:#2563EB;color:#ffffff;padding:8px 10px;text-align:left;border:1px solid #1D4ED8;font-family:Arial,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;'
  const tdStyle = 'padding:8px 10px;border:1px solid #E2E8F0;font-family:Arial,sans-serif;font-size:13px;color:#0F1A2E;'
  const header = `<tr>${week.columns.map(c => `<th style="${thStyle}">${escapeHtml(c.label || '—')}</th>`).join('')}</tr>`
  const body = rows.map((r, i) =>
    `<tr>${week.columns.map(c => `<td style="${tdStyle}background:${i % 2 === 0 ? '#ffffff' : '#FAFBFD'};">${escapeHtml(r.values[c.id] ?? '')}</td>`).join('')}</tr>`
  ).join('')
  const title = `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#0F1A2E;margin-bottom:8px;">Semana ${escapeHtml(week.label || '—')} — ${escapeHtml(mes)}</div>`
  return `${title}<table style="border-collapse:collapse;">${header}${body}</table>`
}

function buildWeekText(week: Week): string {
  const rows = nonEmptyRows(week)
  const header = week.columns.map(c => c.label).join('\t')
  const body = rows.map(r => week.columns.map(c => r.values[c.id] ?? '').join('\t')).join('\n')
  return [header, body].filter(Boolean).join('\n')
}

async function copyWeek(mes: string, week: Week): Promise<boolean> {
  const html = buildWeekHtml(mes, week)
  const text = buildWeekText(week)
  try {
    if (typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({
        'text/html':  new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })
      await navigator.clipboard.write([item])
      return true
    }
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try { await navigator.clipboard.writeText(text); return true } catch { return false }
  }
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

function ReadCell({ value }: { value: string }) {
  return (
    <div style={{ padding: '8px 10px', fontSize: 13, color: value ? C.text : C.textMt }}>
      {value || '—'}
    </div>
  )
}

// ─── Week block ───────────────────────────────────────────────────────────────

function WeekBlock({ mes, week, onChange, onDelete }: {
  mes:      string
  week:     Week
  onChange: (w: Week) => void
  onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)
  const locked = !!week.locked

  const handleCopy = async () => {
    const ok = await copyWeek(mes, week)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }

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

  const displayRows = locked ? nonEmptyRows(week) : week.rows

  return (
    <div style={{ background: C.card, border: `1px solid ${locked ? '#BBF7D0' : C.border}`, borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
      {/* Week header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: locked ? '#F0FDF4' : C.listBg, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Semana</span>
        <input
          value={week.label}
          onChange={e => updateLabel(e.target.value)}
          placeholder="Título de la semana (ej. Semana del 22 al 26 de Junio)"
          style={{ flex: 1, minWidth: 180, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, color: C.text, background: C.card, outline: 'none' }}
        />
        <button onClick={handleCopy} style={{ border: `1px solid ${C.border}`, borderRadius: 6, background: copied ? '#F0FDF4' : C.card, cursor: 'pointer', color: copied ? '#16A34A' : C.textSec, fontSize: 11, fontWeight: 600, padding: '4px 10px', flexShrink: 0 }}>
          {copied ? '✓ Copiado' : '⧉ Copiar'}
        </button>
        {locked ? (
          <button onClick={() => onChange({ ...week, locked: false })} style={{ border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, cursor: 'pointer', color: C.textSec, fontSize: 11, fontWeight: 600, padding: '4px 10px', flexShrink: 0 }}>
            ✏ Editar
          </button>
        ) : (
          <button onClick={() => onChange({ ...week, locked: true })} style={{ border: 'none', borderRadius: 6, background: '#16A34A', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 14px', flexShrink: 0 }}>
            ✓ OK
          </button>
        )}
        <button onClick={onDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.textMt, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
          Eliminar semana
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr>
              {week.columns.map(col => (
                <th key={col.id} style={{ background: C.blue, padding: locked ? '9px 10px' : '4px 4px 4px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {locked ? (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {col.label || '—'}
                    </span>
                  ) : (
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
                  )}
                </th>
              ))}
              {!locked && (
                <th style={{ background: C.blue, width: 36, padding: 0 }}>
                  <button onClick={addColumn} title="Agregar columna" style={{ width: '100%', height: '100%', border: 'none', background: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, fontWeight: 800, padding: '6px 0' }}>
                    +
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={week.columns.length + 1} style={{ padding: '14px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: C.textMt, fontStyle: 'italic' }}>Sin registros</span>
                </td>
              </tr>
            )}
            {displayRows.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 0 ? C.card : '#FAFBFD' }}>
                {week.columns.map(col => (
                  <td key={col.id} style={{ borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
                    {locked
                      ? <ReadCell value={row.values[col.id] ?? ''} />
                      : <Cell value={row.values[col.id] ?? ''} onChange={v => updateCell(row.id, col.id, v)} />}
                  </td>
                ))}
                {!locked && (
                  <td style={{ borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>
                    {week.rows.length > 1 && (
                      <button onClick={() => removeRow(row.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 15, lineHeight: 1, padding: '4px' }}>
                        ×
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={addRow} style={{ border: `1px dashed ${C.blue}`, borderRadius: 5, padding: '5px 0', fontSize: 9, color: C.blue, background: 'transparent', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', width: '100%' }}>
            + Agregar fila
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Month card ───────────────────────────────────────────────────────────────

function MonthCard({ mes, data, onChange, onDelete, onExportPdf }: {
  mes:         string
  data:        MonthData
  onChange:    (d: MonthData) => void
  onDelete:    () => void
  onExportPdf: () => void
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
          <button onClick={onExportPdf} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            ⭳ Exportar PDF
          </button>
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
          <WeekBlock key={w.id} mes={mes} week={w} onChange={updated => updateWeek(w.id, updated)} onDelete={() => deleteWeek(w.id)} />
        ))}
      </div>
    </div>
  )
}

// ─── Printable month (mounted via portal on <body> only while printing) ─────

function PrintableMonth({ mes, data }: { mes: string; data: MonthData }) {
  const weeks = (data.weeks ?? [])
    .map(w => ({ ...w, rows: nonEmptyRows(w) }))
    .filter(w => w.rows.length > 0)

  return (
    <div className="print-portal" style={{ padding: 32, fontFamily: 'Arial, sans-serif', color: C.text }}>
      <div style={{ fontSize: 11, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        Q4 Ingenieros — Reportería
      </div>
      <h1 style={{ margin: '0 0 22px', fontSize: 20 }}>Avance Semanal Proyectos — {mes}</h1>

      {weeks.length === 0 && (
        <p style={{ color: C.textMt, fontSize: 13 }}>Sin datos registrados para este mes.</p>
      )}

      {weeks.map(w => (
        <div key={w.id} style={{ marginBottom: 26, breakInside: 'avoid' } as React.CSSProperties}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Semana {w.label || '—'}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {w.columns.map(c => (
                  <th key={c.id} style={{ background: C.blue, color: '#fff', padding: '8px 10px', textAlign: 'left', border: '1px solid #1D4ED8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {c.label || '—'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {w.rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFD' }}>
                  {w.columns.map(c => (
                    <td key={c.id} style={{ padding: '8px 10px', border: `1px solid ${C.border}`, fontSize: 12 }}>
                      {r.values[c.id] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
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
  const [saveError,    setSaveError]  = useState(false)
  const [printingMonth, setPrintingMonth] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Se pone en true en cuanto el usuario guarda algo. Evita que el fetch de
  // hidratación inicial (que puede resolver tarde) pise con datos viejos de
  // Supabase un guardado que ya ocurrió.
  const hasLocalEditRef = useRef(false)

  // ── Export a single month as PDF via the browser's print dialog ───────────
  useEffect(() => {
    if (!printingMonth) return
    document.body.classList.add('print-report-mode')
    const t = setTimeout(() => window.print(), 60)
    const cleanup = () => {
      document.body.classList.remove('print-report-mode')
      setPrintingMonth(null)
    }
    window.addEventListener('afterprint', cleanup)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', cleanup)
    }
  }, [printingMonth])

  // ── Load: localStorage inmediato, Supabase como fuente de verdad ──────────
  useEffect(() => {
    setAllData(migrateLabels(loadEdits()))
    setExtraMonths(loadExtra())
    fetch('/api/reporte-avance-edits')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        if (hasLocalEditRef.current) return // ya se guardó algo más nuevo, no pisarlo
        if (Object.keys(data.edits).length > 0 || data.extraMonths.length > 0) {
          const migrated = migrateLabels(data.edits)
          setAllData(migrated)
          setExtraMonths(data.extraMonths)
          saveEditsLocal(migrated)
          saveExtraLocal(data.extraMonths)
          if (migrated !== data.edits) {
            fetch('/api/reporte-avance-edits', {
              method:  'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ edits: migrated, extraMonths: data.extraMonths }),
            }).catch(() => {})
          }
        }
      })
      .catch(() => {})
  }, [])

  // ── Persist: localStorage inmediato, Supabase con debounce ───────────────
  // IMPORTANTE: se verifica r.ok — si Supabase falla (ej. tabla inexistente),
  // NO se debe mostrar "Guardado" como si todo estuviera bien, porque en ese
  // caso los datos solo quedan en este navegador y no se sincronizan entre PCs.
  const persist = useCallback((data: Record<string, MonthData>, extra: string[]) => {
    hasLocalEditRef.current = true
    saveEditsLocal(data)
    saveExtraLocal(extra)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/reporte-avance-edits', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ edits: data, extraMonths: extra }),
      }).then(r => {
        if (r.ok) {
          setSaveError(false)
          setSavedTag(true)
          setTimeout(() => setSavedTag(false), 1500)
        } else {
          setSaveError(true)
        }
      }).catch(() => setSaveError(true))
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
          {saveError && (
            <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '3px 9px' }}>
              ⚠ No se pudo guardar en la nube — los cambios quedaron solo en este navegador
            </span>
          )}
        </div>

        {extraMonths.map(mes => (
          <MonthCard
            key={mes}
            mes={mes}
            data={allData[mes] ?? { weeks: [] }}
            onChange={d => handleMonthChange(mes, d)}
            onDelete={() => deleteMonth(mes)}
            onExportPdf={() => setPrintingMonth(mes)}
          />
        ))}

        <AddMonthPanel existing={extraMonths} onAdd={addMonth} />

        {printingMonth && typeof document !== 'undefined' && createPortal(
          <PrintableMonth mes={printingMonth} data={allData[printingMonth] ?? { weeks: [] }} />,
          document.body,
        )}

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
