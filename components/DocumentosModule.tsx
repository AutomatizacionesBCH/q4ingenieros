'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
} as const

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocOverride { status?: 'pagado' | 'pendiente'; fecha?: string }
type Overrides = Record<string, DocOverride>
type TipoFilter   = 'todos' | 'Factura' | 'Boleta de Honorarios' | 'Nota de Crédito'
type EstadoFilter = 'todos' | 'pagado' | 'pendiente'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
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
    return { bg: C.warningBg, color: C.warning, border: '#FDE68A', label: 'Nota de Crédito' }
  return { bg: C.successBg, color: C.success, border: C.successBorder, label: 'Boleta' }
}

// CSV export
function exportCSV(rows: Array<DocItem & { efectiveStatus: string; efectiveFecha: string | null }>) {
  const header = ['N°','Tipo','Descripción','Referencia','Fecha','Estado']
  const data   = rows.map(d => [
    d.numero ?? '',
    d.tipo,
    `"${d.descripcion.replace(/"/g, '""')}"`,
    `"${d.referencia.replace(/"/g, '""')}"`,
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

// ─── Filter pill button ───────────────────────────────────────────────────────
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

// ─── Module ───────────────────────────────────────────────────────────────────
export function DocumentosModule() {
  const isMobile = useIsMobile()
  const [docs,      setDocs]      = useState<DocItem[]>([])
  const [overrides, setOverrides] = useState<Overrides>({})
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Filters
  const [tipoF,   setTipoF]   = useState<TipoFilter>('todos')
  const [estadoF, setEstadoF] = useState<EstadoFilter>('todos')
  const [mesF,    setMesF]    = useState<string>('todos')   // 'todos' | 'YYYY-MM'
  const [search,  setSearch]  = useState('')

  // Editing date inline
  const [editingDate, setEditingDate] = useState<string | null>(null)

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/documents').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/document-overrides').then(r => r.ok ? r.json() : {}),
    ]).then(([docsData, ovData]: [{ docs: DocItem[] }, Overrides]) => {
      setDocs(docsData.docs ?? [])
      setOverrides(ovData ?? {})
      setLoading(false)
    }).catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  // ── Effective values (with overrides) ────────────────────────────────────────
  const effectiveFecha  = useCallback((d: DocItem) => overrides[d.id]?.fecha  ?? d.fecha,  [overrides])
  const effectiveStatus = useCallback((d: DocItem) => overrides[d.id]?.status ?? 'pendiente', [overrides])

  // ── Persist override ─────────────────────────────────────────────────────────
  async function patchOverride(id: string, patch: DocOverride) {
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
    try {
      await fetch('/api/document-overrides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
    } catch {}
  }

  // ── Available months (from docs that have a date) ────────────────────────────
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    docs.forEach(d => {
      const f = effectiveFecha(d)
      if (f) months.add(f.slice(0, 7)) // YYYY-MM
    })
    return Array.from(months).sort()
  }, [docs, effectiveFecha])

  // ── Filtered docs ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(d => {
      if (tipoF !== 'todos' && d.tipo !== tipoF) return false
      if (estadoF !== 'todos' && effectiveStatus(d) !== estadoF) return false
      if (mesF !== 'todos') {
        const f = effectiveFecha(d)
        if (!f || f.slice(0, 7) !== mesF) return false
      }
      if (q) {
        return (
          d.descripcion.toLowerCase().includes(q) ||
          d.referencia.toLowerCase().includes(q)  ||
          String(d.numero ?? '').includes(q)
        )
      }
      return true
    })
  }, [docs, tipoF, estadoF, mesF, search, effectiveFecha, effectiveStatus])

  // ── Counts ───────────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    factura: docs.filter(d => d.tipo === 'Factura').length,
    boleta:  docs.filter(d => d.tipo === 'Boleta de Honorarios').length,
    nc:      docs.filter(d => d.tipo === 'Nota de Crédito').length,
    pagado:  docs.filter(d => effectiveStatus(d) === 'pagado').length,
    pendiente: docs.filter(d => effectiveStatus(d) === 'pendiente').length,
  }), [docs, effectiveStatus])

  const csvRows = filtered.map(d => ({ ...d, efectiveStatus: effectiveStatus(d), efectiveFecha: effectiveFecha(d) }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.canvas, overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '14px 14px 0' : '20px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>Documentos Tributarios</h1>
            {!isMobile && <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textSec }}>Facturas y boletas de honorarios 2026</p>}
          </div>
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

        {/* ── Filters ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 14 }}>

          {/* Row 1: Tipo + Estado */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Tipo</span>
            <Pill label="Todos"    count={docs.length}   active={tipoF === 'todos'}                 color={C.textPrimary} onClick={() => setTipoF('todos')} />
            <Pill label="Facturas" count={counts.factura} active={tipoF === 'Factura'}               color='#1D4ED8'       onClick={() => setTipoF('Factura')} />
            <Pill label="Boletas"  count={counts.boleta}  active={tipoF === 'Boleta de Honorarios'}  color={C.success}     onClick={() => setTipoF('Boleta de Honorarios')} />
            <Pill label="NC"       count={counts.nc}      active={tipoF === 'Nota de Crédito'}       color={C.warning}     onClick={() => setTipoF('Nota de Crédito')} />

            <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Estado</span>
            <Pill label="Todos"     active={estadoF === 'todos'}     color={C.textPrimary} onClick={() => setEstadoF('todos')} />
            <Pill label="Pendiente" count={counts.pendiente} active={estadoF === 'pendiente'} color={C.orange}  onClick={() => setEstadoF('pendiente')} />
            <Pill label="Pagado"    count={counts.pagado}    active={estadoF === 'pagado'}    color={C.success} onClick={() => setEstadoF('pagado')} />
          </div>

          {/* Row 2: Mes dropdown + Buscar */}
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
                outline: 'none', cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="todos">Todos los meses</option>
              {availableMonths.map(ym => {
                const [y, m] = ym.split('-')
                return (
                  <option key={ym} value={ym}>
                    {MESES_FULL[Number(m) - 1]} {y}
                  </option>
                )
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
                <th style={{ ...TH, width: 120 }}>Tipo</th>
                <th style={TH}>Descripción</th>
                <th style={{ ...TH, width: 150 }}>Referencia</th>
                <th style={{ ...TH, width: 130 }}>Fecha</th>
                <th style={{ ...TH, width: 120, textAlign: 'center' }}>Estado</th>
                <th style={{ ...TH, width: 80, textAlign: 'center' }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, idx) => {
                const badge   = tipoBadge(d.tipo)
                const status  = effectiveStatus(d)
                const fecha   = effectiveFecha(d)
                const isPaid  = status === 'pagado'
                const isEditDate = editingDate === d.id

                return (
                  <tr key={d.id} style={{ background: idx % 2 === 0 ? C.card : C.listBg }}>

                    {/* N° */}
                    <td style={{ ...TD, fontFamily: 'monospace', color: C.textSec }}>{d.numero ?? '—'}</td>

                    {/* Tipo */}
                    <td style={TD}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: 'nowrap' }}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Descripción */}
                    <td style={{ ...TD, maxWidth: 260 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.descripcion}>
                        {d.descripcion || '—'}
                      </span>
                    </td>

                    {/* Referencia */}
                    <td style={{ ...TD, color: C.textSec }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.referencia}>
                        {d.referencia}
                      </span>
                    </td>

                    {/* Fecha — click to edit */}
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      {isEditDate ? (
                        <input
                          type="date"
                          defaultValue={fecha ?? ''}
                          autoFocus
                          onBlur={e => { patchOverride(d.id, { fecha: e.target.value || undefined }); setEditingDate(null) }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingDate(null) }}
                          style={{ fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 6px', outline: 'none', color: C.textPrimary }}
                        />
                      ) : (
                        <button onClick={() => setEditingDate(d.id)} title="Click para editar fecha" style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          fontSize: 13, color: fecha ? C.textPrimary : C.textMuted,
                          textDecoration: 'underline dotted', textUnderlineOffset: 3,
                        }}>
                          {fmtDate(fecha)}
                        </button>
                      )}
                    </td>

                    {/* Estado */}
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
                        ↗ Ver
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
