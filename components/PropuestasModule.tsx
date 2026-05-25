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

// ─── Grouped row type ─────────────────────────────────────────────────────────
interface PropuestaGroup {
  key:          number | string
  pce?:         PropuestaItem
  oc?:          PropuestaItem
  primary:      PropuestaItem   // PCE if exists, else OC — used as save target
  codigo:       string
  tipo?:        string
  contraparte:  string
  proyecto:     string
  especialista: string
  comuna:       string | null
}

type EditableField = 'contraparte' | 'proyecto' | 'especialista' | 'comuna'

// ─── Tipo badge colors ────────────────────────────────────────────────────────
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

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(groups: PropuestaGroup[]) {
  const header = ['Código','Tipo','Contraparte','Proyecto','Especialista','Comuna','PCE','OC']
  const data   = groups.map(g => [
    g.codigo,
    g.tipo ? tipoLabel(g.tipo) : '—',
    `"${(g.contraparte ?? '').replace(/"/g, '""')}"`,
    `"${(g.proyecto    ?? '').replace(/"/g, '""')}"`,
    `"${(g.especialista ?? '').replace(/"/g, '""')}"`,
    g.comuna ?? '',
    g.pce ? 'Sí' : 'No',
    g.oc  ? 'Sí' : 'No',
  ])
  const csv  = [header, ...data].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `propuestas-${new Date().toISOString().slice(0,10)}.csv`,
  })
  a.click(); URL.revokeObjectURL(url)
}

// ─── Table styles ─────────────────────────────────────────────────────────────
const TD: React.CSSProperties = {
  padding: '10px 14px', fontSize: 13, color: C.textPrimary,
  borderTop: `1px solid ${C.border}`, verticalAlign: 'middle',
}
const TH: React.CSSProperties = {
  padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap',
}

// ─── Inline editable cell ─────────────────────────────────────────────────────
function EditableCell({
  value, placeholder, onSave, style,
}: {
  value:       string
  placeholder: string
  onSave:      (v: string) => void
  style?:      React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) { setDraft(value); inputRef.current?.select() } }, [editing, value])

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== value) onSave(trimmed)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setEditing(false) }
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
          background: C.editBg, color: C.textPrimary,
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Clic para editar"
      style={{
        cursor: 'text', display: 'block', minHeight: 22,
        borderRadius: 4, padding: '2px 4px', margin: '-2px -4px',
        color: value ? undefined : C.textMuted,
        fontStyle: value ? 'normal' : 'italic',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,80,30,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {value || placeholder}
    </span>
  )
}

// ─── PDF button ───────────────────────────────────────────────────────────────
function PdfBtn({ url, label, variant }: { url: string; label: string; variant: 'orange' | 'blue' }) {
  const isBlue = variant === 'blue'
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '4px 9px', borderRadius: 6,
        border: `1px solid ${isBlue ? C.blueBorder : C.border}`,
        background: isBlue ? C.blueBg : C.card,
        fontSize: 11, fontWeight: 600,
        color: isBlue ? C.blue : C.orange,
        textDecoration: 'none', whiteSpace: 'nowrap',
      }}
    >
      ↗ {label}
    </a>
  )
}

// ─── Module ───────────────────────────────────────────────────────────────────
export function PropuestasModule() {
  const isMobile = useIsMobile()

  const [propuestas, setPropuestas] = useState<PropuestaItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [saving,     setSaving]     = useState<string | null>(null)

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [tipoF,  setTipoF]  = useState('todos')
  const [search, setSearch] = useState('')

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
  async function saveField(group: PropuestaGroup, field: EditableField, value: string) {
    const pid = group.primary.proyectoId

    // Optimistic update — update all propuestas in this group
    setPropuestas(prev => prev.map(p => {
      const sameGroup = pid != null ? p.proyectoId === pid : p.id === group.primary.id
      return sameGroup ? { ...p, [field]: value } : p
    }))

    setSaving(group.primary.id)
    try {
      await fetch(`/api/propuestas/${encodeURIComponent(group.primary.id)}`, {
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

  // ── Group PCE + OC by proyectoId ──────────────────────────────────────────────
  const groups = useMemo<PropuestaGroup[]>(() => {
    const map = new Map<number | string, { pce?: PropuestaItem; oc?: PropuestaItem }>()

    for (const p of propuestas) {
      const key = p.proyectoId != null ? p.proyectoId : p.id
      const existing = map.get(key) ?? {}
      if (p.docType === 'PCE') existing.pce = p
      else                     existing.oc  = p
      map.set(key, existing)
    }

    return Array.from(map.values())
      .map(({ pce, oc }) => {
        const primary = pce ?? oc!
        return {
          key:         primary.proyectoId ?? primary.id,
          pce,
          oc,
          primary,
          codigo:      pce?.codigo ?? oc?.codigo ?? '',
          tipo:        pce?.tipo,
          contraparte: primary.contraparte,
          proyecto:    primary.proyecto,
          especialista: primary.especialista,
          comuna:      primary.comuna,
        }
      })
      .sort((a, b) => {
        const aId = typeof a.key === 'number' ? a.key : 9999
        const bId = typeof b.key === 'number' ? b.key : 9999
        return aId - bId
      })
  }, [propuestas])

  // ── Available tipos (from PCE docs) ───────────────────────────────────────────
  const tiposDisponibles = useMemo(() => {
    const s = new Set(groups.filter(g => g.tipo).map(g => g.tipo as string))
    return Array.from(s).sort()
  }, [groups])

  // ── Filtered groups ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return groups.filter(g => {
      if (tipoF !== 'todos' && g.tipo !== tipoF) return false
      if (search) {
        const q   = search.toLowerCase()
        const hay = [g.contraparte, g.proyecto, g.comuna ?? '', g.especialista, g.codigo,
          g.oc?.ocNumber ?? ''].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [groups, tipoF, search])

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>Cargando propuestas…</div>
  }
  if (error) {
    return <div style={{ padding: 40, color: '#DC2626', fontSize: 14 }}>Error: {error}</div>
  }

  const hasActiveFilters = tipoF !== 'todos' || !!search

  return (
    <div style={{ background: C.canvas, minHeight: '100vh', padding: isMobile ? '16px 12px' : '24px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1.2 }}>
            Propuestas de Cierre
          </h1>
          <p style={{ fontSize: 13, color: C.textSec, margin: '4px 0 0' }}>
            {groups.length} proyecto{groups.length !== 1 ? 's' : ''} · {propuestas.filter(p => p.docType === 'PCE').length} PCE · {propuestas.filter(p => p.docType === 'OC').length} OC
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saving && <span style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>Guardando…</span>}
          <button
            onClick={() => exportCSV(filtered)}
            style={{
              padding: '7px 14px', borderRadius: 7, border: `1px solid ${C.border}`,
              background: C.card, color: C.textSec, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
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
        {tiposDisponibles.length > 0 && (
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
            onClick={() => { setTipoF('todos'); setSearch('') }}
            style={{ fontSize: 12, color: C.orange, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {isMobile ? (
          <MobileList groups={filtered} onSave={saveField} />
        ) : (
          <DesktopTable groups={filtered} total={groups.length} onSave={saveField} />
        )}
      </div>
    </div>
  )
}

// ─── Desktop table ─────────────────────────────────────────────────────────────
function DesktopTable({
  groups, total, onSave,
}: {
  groups: PropuestaGroup[]
  total:  number
  onSave: (g: PropuestaGroup, field: EditableField, value: string) => void
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: C.listBg }}>
          <th style={TH}>Código</th>
          <th style={TH}>Tipo</th>
          <th style={{ ...TH, minWidth: 160 }}>Contraparte</th>
          <th style={{ ...TH, minWidth: 200 }}>Proyecto</th>
          <th style={{ ...TH, minWidth: 120 }}>Especialista</th>
          <th style={{ ...TH, minWidth: 100 }}>Comuna</th>
          <th style={{ ...TH, textAlign: 'center', minWidth: 140 }}>Documentos</th>
        </tr>
      </thead>
      <tbody>
        {groups.length === 0 && (
          <tr>
            <td colSpan={7} style={{ ...TD, textAlign: 'center', color: C.textMuted, padding: 32 }}>
              Sin resultados
            </td>
          </tr>
        )}
        {groups.map((g, i) => {
          const badge     = tipoBadge(g.tipo)
          const tipoText  = g.tipo ? tipoLabel(g.tipo) : null
          const rowBg     = i % 2 === 0 ? C.card : C.listBg

          return (
            <tr key={String(g.key)} style={{ background: rowBg }}>

              {/* Código */}
              <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.textSec }}>
                  {g.codigo}
                </span>
              </td>

              {/* Tipo */}
              <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                {badge && tipoText ? (
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 4,
                    background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                  }}>
                    {tipoText}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: C.textMuted }}>—</span>
                )}
              </td>

              {/* Contraparte — editable */}
              <td style={{ ...TD, maxWidth: 200 }}>
                <EditableCell
                  value={g.contraparte ?? ''}
                  placeholder="—"
                  onSave={v => onSave(g, 'contraparte', v)}
                  style={{ fontWeight: 600, fontSize: 13 }}
                />
              </td>

              {/* Proyecto — editable */}
              <td style={{ ...TD, maxWidth: 280 }}>
                <EditableCell
                  value={g.proyecto ?? ''}
                  placeholder="—"
                  onSave={v => onSave(g, 'proyecto', v)}
                  style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}
                />
              </td>

              {/* Especialista — editable */}
              <td style={{ ...TD, maxWidth: 160 }}>
                <EditableCell
                  value={g.especialista ?? ''}
                  placeholder="—"
                  onSave={v => onSave(g, 'especialista', v)}
                  style={{ fontSize: 12, color: C.textSec }}
                />
              </td>

              {/* Comuna — editable */}
              <td style={{ ...TD, maxWidth: 120 }}>
                <EditableCell
                  value={g.comuna ?? ''}
                  placeholder="—"
                  onSave={v => onSave(g, 'comuna', v)}
                  style={{ fontSize: 12, color: C.textSec }}
                />
              </td>

              {/* Documentos: PCE + OC buttons */}
              <td style={{ ...TD, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {g.pce && <PdfBtn url={g.pce.url} label="PCE" variant="orange" />}
                  {g.oc  && <PdfBtn url={g.oc.url}  label="OC"  variant="blue"   />}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
      {groups.length > 0 && groups.length !== total && (
        <tfoot>
          <tr>
            <td colSpan={7} style={{ ...TD, textAlign: 'right', fontSize: 11, color: C.textMuted, background: C.listBg }}>
              Mostrando {groups.length} de {total}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}

// ─── Mobile list ───────────────────────────────────────────────────────────────
function MobileList({
  groups, onSave,
}: {
  groups: PropuestaGroup[]
  onSave: (g: PropuestaGroup, field: EditableField, value: string) => void
}) {
  if (groups.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
        Sin resultados
      </div>
    )
  }

  return (
    <div>
      {groups.map((g, i) => {
        const badge    = tipoBadge(g.tipo)
        const tipoText = g.tipo ? tipoLabel(g.tipo) : null

        return (
          <div key={String(g.key)} style={{ padding: '14px 16px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
            {/* Top row: código + tipo + PDF buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: C.textSec }}>
                  {g.codigo}
                </span>
                {badge && tipoText && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                  }}>
                    {tipoText}
                  </span>
                )}
              </div>
              {/* PDF buttons */}
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                {g.pce && <PdfBtn url={g.pce.url} label="PCE" variant="orange" />}
                {g.oc  && <PdfBtn url={g.oc.url}  label="OC"  variant="blue"   />}
              </div>
            </div>

            {/* Editable fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <EditableCell
                value={g.contraparte ?? ''}
                placeholder="Contraparte…"
                onSave={v => onSave(g, 'contraparte', v)}
                style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}
              />
              <EditableCell
                value={g.proyecto ?? ''}
                placeholder="Descripción del proyecto…"
                onSave={v => onSave(g, 'proyecto', v)}
                style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Especialista</div>
                  <EditableCell
                    value={g.especialista ?? ''}
                    placeholder="—"
                    onSave={v => onSave(g, 'especialista', v)}
                    style={{ fontSize: 11, color: C.textSec }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Comuna</div>
                  <EditableCell
                    value={g.comuna ?? ''}
                    placeholder="—"
                    onSave={v => onSave(g, 'comuna', v)}
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
