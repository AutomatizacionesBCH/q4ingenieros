'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { PropuestaItem } from '@/lib/propuesta-utils'
import { tipoLabel } from '@/lib/propuesta-utils'
import { useIsMobile } from '@/hooks/useIsMobile'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  canvas:       '#F0F2F6',
  card:         '#FFFFFF',
  border:       '#E2E8F0',
  textPrimary:  '#0F1A2E',
  textSec:      '#64748B',
  textMuted:    '#94A3B8',
  orange:       '#E5501E',
  orangeFaint:  'rgba(229,80,30,0.06)',
  blue:         '#1D4ED8',
  blueFaint:    'rgba(29,78,216,0.06)',
  blueBorder:   '#BFDBFE',
  blueBg:       '#EFF6FF',
  warning:      '#CA8A04',
  warningBg:    '#FEFCE8',
  warningBorder:'#FDE68A',
  listBg:       '#F8FAFC',
  editBg:       '#FFFBF0',
  editBorder:   '#FCD34D',
} as const

// ─── Tipo badges (PCE specialty types) ───────────────────────────────────────
function tipoBadge(tipo: string | undefined) {
  if (!tipo) return null
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    PAV:  { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    VER:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
    ROT:  { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
    CCL:  { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
    IMIV: { bg: '#FAF5FF', color: '#7C3AED', border: '#DDD6FE' },
    PRY:  { bg: C.warningBg, color: C.warning, border: C.warningBorder },
    ARQ:  { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
    EST:  { bg: '#F8FAFC', color: '#475569', border: '#CBD5E1' },
  }
  return colors[tipo.toUpperCase()] ?? { bg: C.listBg, color: C.textSec, border: C.border }
}

type EditableField = 'contraparte' | 'proyecto' | 'especialista' | 'comuna'

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(rows: PropuestaItem[]) {
  const header = ['Código','Doc','Tipo','Contraparte','Proyecto','Especialista','Comuna']
  const data   = rows.map(p => [
    p.codigo,
    p.docType,
    p.docType === 'PCE' ? tipoLabel(p.tipo ?? '') : 'Orden de Compra',
    `"${(p.contraparte ?? '').replace(/"/g, '""')}"`,
    `"${(p.proyecto    ?? '').replace(/"/g, '""')}"`,
    `"${(p.especialista ?? '').replace(/"/g, '""')}"`,
    p.comuna ?? '',
  ])
  const csv  = [header, ...data].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `propuestas-${new Date().toISOString().slice(0,10)}.csv`,
  })
  a.click(); URL.revokeObjectURL(url)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const TD: React.CSSProperties = {
  padding: '10px 14px', fontSize: 13, color: C.textPrimary,
  borderTop: `1px solid ${C.border}`, verticalAlign: 'middle',
}
const TH: React.CSSProperties = {
  padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap',
}

// ─── Inline editable cell ─────────────────────────────────────────────────────
interface EditableCellProps {
  value:       string
  placeholder: string
  onSave:      (v: string) => void
  style?:      React.CSSProperties
  inputStyle?: React.CSSProperties
}

function EditableCell({ value, placeholder, onSave, style, inputStyle }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const inputRef              = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(value)
    setEditing(true)
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== value) onSave(trimmed)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setEditing(false); setDraft(value) }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        style={{
          width: '100%', padding: '5px 8px',
          border: `1.5px solid ${C.editBorder}`,
          borderRadius: 5, fontSize: 13,
          background: C.editBg,
          color: C.textPrimary, outline: 'none',
          boxSizing: 'border-box',
          ...inputStyle,
        }}
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      title="Clic para editar"
      style={{
        cursor: 'text',
        display: 'block',
        minHeight: 22,
        borderRadius: 4,
        padding: '2px 4px',
        margin: '-2px -4px',
        color: value ? undefined : C.textMuted,
        fontStyle: value ? 'normal' : 'italic',
        transition: 'background 0.1s',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,80,30,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {value || placeholder}
    </span>
  )
}

// ─── Module ───────────────────────────────────────────────────────────────────
export function PropuestasModule() {
  const isMobile = useIsMobile()

  const [propuestas, setPropuestas] = useState<PropuestaItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [saving,     setSaving]     = useState<string | null>(null) // doc_id being saved

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [docTypeF, setDocTypeF] = useState<'todos' | 'PCE' | 'OC'>('todos')
  const [tipoF,    setTipoF]    = useState('todos')
  const [search,   setSearch]   = useState('')

  // ── Load ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/propuestas')
      .then(r => r.json())
      .then((d: { propuestas: PropuestaItem[] }) => {
        setPropuestas(d.propuestas ?? [])
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  // ── Save field ────────────────────────────────────────────────────────────────
  async function saveField(id: string, field: EditableField, value: string) {
    // Optimistic update
    setPropuestas(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ))
    setSaving(id)
    try {
      await fetch(`/api/propuestas/${encodeURIComponent(id)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: value }),
      })
    } catch (e) {
      console.error('Error guardando propuesta', e)
    } finally {
      setSaving(null)
    }
  }

  // ── Available tipos (PCE only) ────────────────────────────────────────────────
  const tiposDisponibles = useMemo(() => {
    const s = new Set(
      propuestas
        .filter(p => p.docType === 'PCE' && p.tipo)
        .map(p => p.tipo as string)
    )
    return Array.from(s).sort()
  }, [propuestas])

  // ── Filtered rows ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return propuestas.filter(p => {
      if (docTypeF !== 'todos' && p.docType !== docTypeF) return false
      // tipo filter only applies to PCE
      if (tipoF !== 'todos' && p.docType === 'PCE' && p.tipo !== tipoF) return false
      if (search) {
        const q   = search.toLowerCase()
        const hay = [p.contraparte, p.proyecto, p.comuna ?? '', p.especialista, p.codigo, p.ocNumber ?? '']
          .join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [propuestas, docTypeF, tipoF, search])

  const pceCount = useMemo(() => propuestas.filter(p => p.docType === 'PCE').length, [propuestas])
  const ocCount  = useMemo(() => propuestas.filter(p => p.docType === 'OC').length,  [propuestas])

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>Cargando propuestas…</div>
  }
  if (error) {
    return <div style={{ padding: 40, color: '#DC2626', fontSize: 14 }}>Error: {error}</div>
  }

  const hasActiveFilters = docTypeF !== 'todos' || tipoF !== 'todos' || !!search

  return (
    <div style={{ background: C.canvas, minHeight: '100vh', padding: isMobile ? '16px 12px' : '24px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1.2 }}>
            Propuestas de Cierre
          </h1>
          <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.textSec }}>
              {propuestas.length} documento{propuestas.length !== 1 ? 's' : ''}
            </span>
            {pceCount > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                background: 'rgba(229,80,30,0.08)', color: C.orange, border: `1px solid rgba(229,80,30,0.2)`,
              }}>
                {pceCount} PCE
              </span>
            )}
            {ocCount > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`,
              }}>
                {ocCount} OC
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saving && (
            <span style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>Guardando…</span>
          )}
          <button
            onClick={() => exportCSV(filtered)}
            style={{
              padding: '7px 14px', borderRadius: 7, border: `1px solid ${C.border}`,
              background: C.card, color: C.textSec, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar contraparte, proyecto, OC…"
          style={{
            padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`,
            fontSize: 12, outline: 'none', background: C.card, color: C.textPrimary,
            width: isMobile ? '100%' : 240,
          }}
        />

        {/* DocType filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['todos', 'PCE', 'OC'] as const).map(dt => {
            const active = docTypeF === dt
            const accentBg    = dt === 'OC' ? C.blueBg    : 'rgba(229,80,30,0.08)'
            const accentColor = dt === 'OC' ? C.blue      : C.orange
            const accentBord  = dt === 'OC' ? C.blueBorder : 'rgba(229,80,30,0.3)'
            return (
              <button
                key={dt}
                onClick={() => setDocTypeF(dt)}
                style={{
                  padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  border: `1px solid ${active && dt !== 'todos' ? accentBord : C.border}`,
                  background: active ? (dt === 'todos' ? C.card : accentBg) : C.card,
                  color: active && dt !== 'todos' ? accentColor : C.textSec,
                  transition: 'all 0.1s',
                }}
              >
                {dt === 'todos' ? 'Todos' : dt}
              </button>
            )
          })}
        </div>

        {/* Tipo filter (PCE only) */}
        {tiposDisponibles.length > 0 && docTypeF !== 'OC' && (
          <select
            value={tipoF}
            onChange={e => setTipoF(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: 7,
              border: `1px solid ${tipoF !== 'todos' ? C.orange : C.border}`,
              background: tipoF !== 'todos' ? C.orangeFaint : C.card,
              color: C.textPrimary, fontSize: 12, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="todos">Todos los tipos</option>
            {tiposDisponibles.map(t => (
              <option key={t} value={t}>{tipoLabel(t)}</option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            onClick={() => { setDocTypeF('todos'); setTipoF('todos'); setSearch('') }}
            style={{ fontSize: 12, color: C.orange, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {isMobile ? (
          <MobileList items={filtered} onSave={saveField} />
        ) : (
          <DesktopTable
            items={filtered}
            total={propuestas.length}
            onSave={saveField}
          />
        )}
      </div>
    </div>
  )
}

// ─── Desktop table ─────────────────────────────────────────────────────────────
function DesktopTable({
  items, total, onSave,
}: {
  items:  PropuestaItem[]
  total:  number
  onSave: (id: string, field: EditableField, value: string) => void
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: C.listBg }}>
          <th style={TH}>Código</th>
          <th style={TH}>Tipo</th>
          <th style={{ ...TH, minWidth: 160 }}>Contraparte</th>
          <th style={{ ...TH, minWidth: 200 }}>Proyecto</th>
          <th style={{ ...TH, minWidth: 130 }}>Especialista</th>
          <th style={{ ...TH, minWidth: 110 }}>Comuna</th>
          <th style={{ ...TH, textAlign: 'center' }}>PDF</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 && (
          <tr>
            <td colSpan={7} style={{ ...TD, textAlign: 'center', color: C.textMuted, padding: 32 }}>
              Sin resultados
            </td>
          </tr>
        )}
        {items.map((p, i) => {
          const isOC      = p.docType === 'OC'
          const rowBg     = i % 2 === 0 ? C.card : C.listBg
          const badge     = isOC ? null : tipoBadge(p.tipo)
          const tipoText  = isOC ? 'Orden de Compra' : tipoLabel(p.tipo ?? '')

          return (
            <tr key={p.id} style={{ background: rowBg }}>
              {/* Código + doc type badge */}
              <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 12,
                    color: isOC ? C.blue : C.textSec,
                    fontWeight: isOC ? 700 : 400,
                  }}>
                    {p.codigo}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    alignSelf: 'flex-start',
                    background: isOC ? C.blueBg       : 'rgba(229,80,30,0.08)',
                    color:      isOC ? C.blue         : C.orange,
                    border:    `1px solid ${isOC ? C.blueBorder : 'rgba(229,80,30,0.2)'}`,
                    letterSpacing: '0.05em',
                  }}>
                    {p.docType}
                  </span>
                </div>
              </td>

              {/* Tipo */}
              <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                {badge ? (
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 4,
                    background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                  }}>
                    {tipoText}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: C.textMuted }}>{tipoText}</span>
                )}
              </td>

              {/* Contraparte — editable */}
              <td style={{ ...TD, maxWidth: 200 }}>
                <EditableCell
                  value={p.contraparte ?? ''}
                  placeholder="—"
                  onSave={v => onSave(p.id, 'contraparte', v)}
                  style={{ fontWeight: 600, fontSize: 13 }}
                />
              </td>

              {/* Proyecto — editable */}
              <td style={{ ...TD, maxWidth: 280 }}>
                <EditableCell
                  value={p.proyecto ?? ''}
                  placeholder="—"
                  onSave={v => onSave(p.id, 'proyecto', v)}
                  style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}
                />
              </td>

              {/* Especialista — editable */}
              <td style={{ ...TD, maxWidth: 180 }}>
                <EditableCell
                  value={p.especialista ?? ''}
                  placeholder="—"
                  onSave={v => onSave(p.id, 'especialista', v)}
                  style={{ fontSize: 12, color: C.textSec }}
                />
              </td>

              {/* Comuna — editable */}
              <td style={{ ...TD, maxWidth: 130 }}>
                <EditableCell
                  value={p.comuna ?? ''}
                  placeholder="—"
                  onSave={v => onSave(p.id, 'comuna', v)}
                  style={{ fontSize: 12, color: C.textSec }}
                />
              </td>

              {/* PDF */}
              <td style={{ ...TD, textAlign: 'center' }}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${isOC ? C.blueBorder : C.border}`,
                    background: isOC ? C.blueBg : C.card,
                    fontSize: 11, fontWeight: 600,
                    color: isOC ? C.blue : C.orange,
                    textDecoration: 'none',
                  }}
                >
                  ↗ Abrir
                </a>
              </td>
            </tr>
          )
        })}
      </tbody>
      {items.length > 0 && items.length !== total && (
        <tfoot>
          <tr>
            <td colSpan={7} style={{ ...TD, textAlign: 'right', fontSize: 11, color: C.textMuted, background: C.listBg }}>
              Mostrando {items.length} de {total}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}

// ─── Mobile list ───────────────────────────────────────────────────────────────
function MobileList({
  items, onSave,
}: {
  items:  PropuestaItem[]
  onSave: (id: string, field: EditableField, value: string) => void
}) {
  if (items.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
        Sin resultados
      </div>
    )
  }

  return (
    <div>
      {items.map((p, i) => {
        const isOC     = p.docType === 'OC'
        const badge    = isOC ? null : tipoBadge(p.tipo)
        const tipoText = isOC ? 'Orden de Compra' : tipoLabel(p.tipo ?? '')

        return (
          <div key={p.id} style={{ padding: '14px 16px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
            {/* Top row: código badges + PDF link */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                  color: isOC ? C.blue : C.textMuted,
                }}>
                  {p.codigo}
                </span>
                {/* DocType chip */}
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                  background: isOC ? C.blueBg : 'rgba(229,80,30,0.08)',
                  color:      isOC ? C.blue   : C.orange,
                  border:    `1px solid ${isOC ? C.blueBorder : 'rgba(229,80,30,0.2)'}`,
                }}>
                  {p.docType}
                </span>
                {/* Tipo chip (PCE only) */}
                {badge && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                  }}>
                    {tipoText}
                  </span>
                )}
              </div>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, color: isOC ? C.blue : C.orange,
                  fontWeight: 600, textDecoration: 'none', flexShrink: 0,
                }}
              >
                Ver PDF ↗
              </a>
            </div>

            {/* Editable fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <EditableCell
                value={p.contraparte ?? ''}
                placeholder="Contraparte…"
                onSave={v => onSave(p.id, 'contraparte', v)}
                style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}
              />
              <EditableCell
                value={p.proyecto ?? ''}
                placeholder="Descripción del proyecto…"
                onSave={v => onSave(p.id, 'proyecto', v)}
                style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Especialista</div>
                  <EditableCell
                    value={p.especialista ?? ''}
                    placeholder="—"
                    onSave={v => onSave(p.id, 'especialista', v)}
                    style={{ fontSize: 11, color: C.textSec }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Comuna</div>
                  <EditableCell
                    value={p.comuna ?? ''}
                    placeholder="—"
                    onSave={v => onSave(p.id, 'comuna', v)}
                    style={{ fontSize: 11, color: C.textSec }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
