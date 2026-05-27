'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { DocItem } from '@/app/api/documents/route'
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
  success:      '#16A34A',
  successBg:    '#F0FDF4',
  successBorder:'#BBF7D0',
  warning:      '#CA8A04',
  warningBg:    '#FEFCE8',
  danger:       '#DC2626',
  listBg:       '#F8FAFC',
  editBg:       '#FFFBF0',
  editBorder:   '#FCD34D',
} as const

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocOverride {
  status?:      'pagado' | 'pendiente'
  fecha?:       string
  descripcion?: string
  referencia?:  string
}
type Overrides    = Record<string, DocOverride>
type TipoFilter   = 'todos' | 'Factura' | 'Boleta de Honorarios' | 'Nota de Crédito'
type EstadoFilter = 'todos' | 'pagado' | 'pendiente'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  const mes = MESES_FULL[Number(m) - 1]
  return `${Number(d)} de ${mes} del ${y}`
}

function tipoBadge(tipo: DocItem['tipo']) {
  if (tipo === 'Factura')
    return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Factura' }
  if (tipo === 'Nota de Crédito')
    return { bg: C.warningBg, color: C.warning, border: '#FDE68A', label: 'NC' }
  return { bg: C.successBg, color: C.success, border: C.successBorder, label: 'Boleta' }
}

function exportCSV(rows: Array<DocItem & { efectiveStatus: string; efectiveFecha: string | null; efectiveDesc: string; efectiveRef: string }>) {
  const header = ['N°','Tipo','Descripción','Referencia','Fecha','Estado']
  const data   = rows.map(d => [
    d.numero ?? '',
    d.tipo,
    `"${d.efectiveDesc.replace(/"/g, '""')}"`,
    `"${d.efectiveRef.replace(/"/g, '""')}"`,
    d.efectiveFecha ?? '',
    d.efectiveStatus,
  ])
  const csv  = [header, ...data].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `documentos-${new Date().toISOString().slice(0,10)}.csv` })
  a.click(); URL.revokeObjectURL(url)
}

// ─── Table styles ─────────────────────────────────────────────────────────────
const TD: React.CSSProperties = { padding: '10px 14px', fontSize: 13, color: C.textPrimary, borderTop: `1px solid ${C.border}`, verticalAlign: 'middle' }
const TH: React.CSSProperties = { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' }

// ─── Filter pill ──────────────────────────────────────────────────────────────
function Pill({ label, count, active, color, onClick }: { label: string; count?: number; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
      fontSize: 12, fontWeight: 600, border: `1px solid ${active ? color : C.border}`,
      background: active ? color : C.card, color: active ? '#fff' : C.textSec,
      transition: 'all 0.12s',
    }}>
      {label}
      {count !== undefined && (
        <span style={{ background: active ? 'rgba(255,255,255,0.25)' : C.listBg, color: active ? '#fff' : C.textMuted, borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
          {count}
        </span>
      )}
    </button>
  )
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
          width: '100%', padding: '4px 7px',
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
        cursor: 'text', display: 'block', minHeight: 20,
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

// ─── Module ───────────────────────────────────────────────────────────────────
export function DocumentosModule() {
  const isMobile = useIsMobile()
  const [docs,      setDocs]      = useState<DocItem[]>([])
  const [overrides, setOverrides] = useState<Overrides>({})
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Filters
  const [tipoF,   setTipoF]   = useState<TipoFilter>('todos')
  const [estadoF, setEstadoF] = useState<EstadoFilter>('todos')
  const [mesF,    setMesF]    = useState<string>('todos')
  const [search,  setSearch]  = useState('')

  // Editing date inline (date-picker style, only one at a time)
  const [editingDate, setEditingDate] = useState<string | null>(null)

  // ── Load data ────────────────────────────────────────────────────────────────
  const loadDocs = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    const url = refresh ? '/api/documents?refresh=1' : '/api/documents'
    Promise.all([
      fetch(url).then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/document-overrides').then(r => r.ok ? r.json() : {}),
    ]).then(([docsData, ovData]: [{ docs: DocItem[] }, Overrides]) => {
      setDocs(docsData.docs ?? [])
      setOverrides(ovData ?? {})
    }).catch(e => { setError(String(e)) })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  // ── Effective values (with overrides) ─────────────────────────────────────────
  const effectiveFecha  = useCallback((d: DocItem) => overrides[d.id]?.fecha  ?? d.fecha,  [overrides])
  const effectiveStatus = useCallback((d: DocItem) => overrides[d.id]?.status ?? 'pendiente', [overrides])
  const effectiveDesc   = useCallback((d: DocItem) => overrides[d.id]?.descripcion ?? d.descripcion, [overrides])
  const effectiveRef    = useCallback((d: DocItem) => overrides[d.id]?.referencia  ?? d.referencia,  [overrides])

  // ── Persist override ─────────────────────────────────────────────────────────
  async function patchOverride(id: string, patch: DocOverride) {
    // Optimistic local update
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
    try {
      await fetch('/api/document-overrides', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, ...patch }),
      })
    } catch { /* ignore */ }
  }

  // ── Available months ──────────────────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    docs.forEach(d => {
      const f = effectiveFecha(d)
      if (f) months.add(f.slice(0, 7))
    })
    return Array.from(months).sort()
  }, [docs, effectiveFecha])

  // ── Filtered docs ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(d => {
      if (tipoF   !== 'todos' && d.tipo !== tipoF)                             return false
      if (estadoF !== 'todos' && effectiveStatus(d) !== estadoF)               return false
      if (mesF    !== 'todos') {
        const f = effectiveFecha(d)
        if (!f || f.slice(0, 7) !== mesF) return false
      }
      if (q) {
        const desc = effectiveDesc(d).toLowerCase()
        const ref  = effectiveRef(d).toLowerCase()
        return desc.includes(q) || ref.includes(q) || String(d.numero ?? '').includes(q)
      }
      return true
    })
  }, [docs, tipoF, estadoF, mesF, search, effectiveFecha, effectiveStatus, effectiveDesc, effectiveRef])

  // ── Counts ────────────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    factura:   docs.filter(d => d.tipo === 'Factura').length,
    boleta:    docs.filter(d => d.tipo === 'Boleta de Honorarios').length,
    nc:        docs.filter(d => d.tipo === 'Nota de Crédito').length,
    pagado:    docs.filter(d => effectiveStatus(d) === 'pagado').length,
    pendiente: docs.filter(d => effectiveStatus(d) === 'pendiente').length,
  }), [docs, effectiveStatus])

  const csvRows = filtered.map(d => ({
    ...d,
    efectiveStatus: effectiveStatus(d),
    efectiveFecha:  effectiveFecha(d),
    efectiveDesc:   effectiveDesc(d),
    efectiveRef:    effectiveRef(d),
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.canvas, overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '14px 14px 0' : '20px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>Documentos Tributarios</h1>
            {!isMobile && <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textSec }}>Facturas y boletas de honorarios 2026</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => loadDocs(true)}
              disabled={refreshing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, cursor: refreshing ? 'default' : 'pointer',
                fontSize: 13, fontWeight: 600, border: `1px solid ${C.border}`,
                background: refreshing ? C.listBg : '#fff', color: refreshing ? C.textMuted : C.textPrimary,
                opacity: refreshing ? 0.7 : 1, transition: 'all 0.15s',
              }}
            >
              {refreshing ? '↻ Actualizando…' : '↻ Actualizar'}
            </button>
            {!loading && filtered.length > 0 && (
              <button onClick={() => exportCSV(csvRows)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, background: C.orange, color: '#fff', border: 'none',
              }}>
                ↓ Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* ── Filters ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 14 }}>
          {/* Row 1: Tipo + Estado */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Tipo</span>
            <Pill label="Todos"    count={docs.length}   active={tipoF === 'todos'}                color={C.textPrimary} onClick={() => setTipoF('todos')} />
            <Pill label="Facturas" count={counts.factura} active={tipoF === 'Factura'}              color='#1D4ED8'       onClick={() => setTipoF('Factura')} />
            <Pill label="Boletas"  count={counts.boleta}  active={tipoF === 'Boleta de Honorarios'} color={C.success}     onClick={() => setTipoF('Boleta de Honorarios')} />
            <Pill label="NC"       count={counts.nc}      active={tipoF === 'Nota de Crédito'}      color={C.warning}     onClick={() => setTipoF('Nota de Crédito')} />

            <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Estado</span>
            <Pill label="Todos"     active={estadoF === 'todos'}     color={C.textPrimary} onClick={() => setEstadoF('todos')} />
            <Pill label="Pendiente" count={counts.pendiente} active={estadoF === 'pendiente'} color={C.orange}  onClick={() => setEstadoF('pendiente')} />
            <Pill label="Pagado"    count={counts.pagado}    active={estadoF === 'pagado'}    color={C.success} onClick={() => setEstadoF('pagado')} />
          </div>

          {/* Row 2: Mes + Buscar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mes</span>
            <select
              value={mesF}
              onChange={e => setMesF(e.target.value)}
              style={{
                padding: '5px 32px 5px 12px', borderRadius: 8, fontSize: 13,
                border: `1px solid ${mesF !== 'todos' ? '#1D4ED8' : C.border}`,
                background: mesF !== 'todos' ? '#EFF6FF' : C.card,
                color: mesF !== 'todos' ? '#1D4ED8' : C.textPrimary,
                fontWeight: mesF !== 'todos' ? 600 : 400,
                outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
              }}
            >
              <option value="todos">Todos los meses</option>
              {availableMonths.map(ym => {
                const [y, m] = ym.split('-')
                return <option key={ym} value={ym}>{MESES_FULL[Number(m) - 1]} {y}</option>
              })}
            </select>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{ flex: 1, minWidth: 140, maxWidth: 260, padding: '5px 12px', borderRadius: 8, fontSize: 13, border: `1px solid ${C.border}`, outline: 'none', color: C.textPrimary, background: C.card }}
            />
            {(tipoF !== 'todos' || estadoF !== 'todos' || mesF !== 'todos' || search) && (
              <span style={{ fontSize: 12, color: C.textMuted }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', margin: isMobile ? '0 14px 14px' : '0 28px 28px', border: `1px solid ${C.border}`, borderRadius: 12, background: C.card, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>Cargando documentos…</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.danger, fontSize: 14 }}>Error: {error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>No hay documentos que mostrar.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: C.listBg }}>
                <th style={{ ...TH, width: 55 }}>N°</th>
                <th style={{ ...TH, width: 90 }}>Tipo</th>
                <th style={{ ...TH, minWidth: 180 }}>Descripción</th>
                <th style={{ ...TH, minWidth: 130 }}>Referencia</th>
                <th style={{ ...TH, width: 165 }}>Fecha</th>
                <th style={{ ...TH, width: 120, textAlign: 'center' }}>Estado</th>
                <th style={{ ...TH, width: 70, textAlign: 'center' }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, idx) => {
                const badge      = tipoBadge(d.tipo)
                const status     = effectiveStatus(d)
                const fecha      = effectiveFecha(d)
                const desc       = effectiveDesc(d)
                const ref        = effectiveRef(d)
                const isPaid     = status === 'pagado'
                const isEditDate = editingDate === d.id

                return (
                  <tr key={d.id} style={{ background: idx % 2 === 0 ? C.card : C.listBg }}>

                    {/* N° */}
                    <td style={{ ...TD, fontFamily: 'monospace', color: C.textSec, whiteSpace: 'nowrap' }}>
                      {d.numero ?? '—'}
                    </td>

                    {/* Tipo */}
                    <td style={TD}>
                      <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: 'nowrap' }}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Descripción — editable */}
                    <td style={{ ...TD, maxWidth: 260 }}>
                      <EditableCell
                        value={desc}
                        placeholder="Sin descripción"
                        onSave={v => patchOverride(d.id, { descripcion: v || undefined })}
                      />
                    </td>

                    {/* Referencia — editable */}
                    <td style={{ ...TD, maxWidth: 180 }}>
                      <EditableCell
                        value={ref === '—' ? '' : ref}
                        placeholder="—"
                        onSave={v => patchOverride(d.id, { referencia: v || undefined })}
                        style={{ color: C.textSec, fontSize: 12 }}
                      />
                    </td>

                    {/* Fecha — date-picker edit */}
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      {isEditDate ? (
                        <input
                          type="date"
                          defaultValue={fecha ?? ''}
                          autoFocus
                          onBlur={e => { patchOverride(d.id, { fecha: e.target.value || undefined }); setEditingDate(null) }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingDate(null) }}
                          style={{ fontSize: 12, border: `1.5px solid ${C.editBorder}`, borderRadius: 6, padding: '3px 6px', outline: 'none', color: C.textPrimary, background: C.editBg }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingDate(d.id)}
                          title="Clic para editar fecha"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontSize: 13, color: fecha ? C.textPrimary : C.textMuted,
                            textDecoration: 'underline dotted', textUnderlineOffset: 3,
                          }}
                        >
                          {fmtDate(fecha)}
                        </button>
                      )}
                    </td>

                    {/* Estado — toggle */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <button
                        onClick={() => patchOverride(d.id, { status: isPaid ? 'pendiente' : 'pagado' })}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                          fontSize: 11, fontWeight: 600,
                          border: `1px solid ${isPaid ? C.successBorder : C.border}`,
                          background: isPaid ? C.successBg : 'transparent',
                          color: isPaid ? C.success : C.textMuted,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isPaid ? '✓ Pagado' : 'Pendiente'}
                      </button>
                    </td>

                    {/* PDF */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${C.border}`, background: C.card, color: C.orange,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                      }}>
                        ↗
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
