'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DocItem } from '@/app/api/documents/route'
import { useIsMobile } from '@/hooks/useIsMobile'

// ─── Design tokens (mismos que ProyectosModule) ───────────────────────────────
const C = {
  canvas:      '#F0F2F6',
  card:        '#FFFFFF',
  border:      '#E2E8F0',
  textPrimary: '#0F1A2E',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  orange:      '#E5501E',
  success:     '#16A34A',
  successBg:   '#F0FDF4',
  successBorder:'#BBF7D0',
  warning:     '#CA8A04',
  warningBg:   '#FEFCE8',
  listBg:      '#F8FAFC',
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtSize(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

function tipoBadge(tipo: DocItem['tipo']) {
  if (tipo === 'Factura')
    return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Factura' }
  if (tipo === 'Nota de Crédito')
    return { bg: C.warningBg, color: C.warning, border: '#FDE68A', label: 'NC' }
  return { bg: C.successBg, color: C.success, border: C.successBorder, label: 'Boleta' }
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(docs: DocItem[]) {
  const header = ['N°', 'Tipo', 'Descripción', 'Referencia', 'Fecha', 'Tamaño (KB)']
  const rows = docs.map(d => [
    d.numero ?? '',
    d.tipo,
    `"${d.descripcion.replace(/"/g, '""')}"`,
    `"${d.referencia.replace(/"/g, '""')}"`,
    d.fecha,
    d.sizeKb,
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `documentos-tributarios-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Table cell style ─────────────────────────────────────────────────────────
const TD: React.CSSProperties = {
  padding: '10px 14px', fontSize: 13, color: C.textPrimary,
  borderTop: `1px solid ${C.border}`, verticalAlign: 'middle',
}
const TH: React.CSSProperties = {
  padding: '10px 14px', fontSize: 11, fontWeight: 700,
  color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em',
  textAlign: 'left', whiteSpace: 'nowrap',
}

type TipoFilter = 'todos' | 'Factura' | 'Boleta de Honorarios' | 'Nota de Crédito'

// ─── Module ───────────────────────────────────────────────────────────────────
export function DocumentosModule() {
  const isMobile = useIsMobile()
  const [docs,      setDocs]      = useState<DocItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [tipoF,     setTipoF]     = useState<TipoFilter>('todos')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: DocItem[]) => { setDocs(data); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(d => {
      if (tipoF !== 'todos' && d.tipo !== tipoF) return false
      if (q) {
        return (
          d.descripcion.toLowerCase().includes(q) ||
          d.referencia.toLowerCase().includes(q)  ||
          String(d.numero ?? '').includes(q)
        )
      }
      return true
    })
  }, [docs, tipoF, search])

  // Counts per type
  const counts = useMemo(() => ({
    todos:    docs.length,
    facturas: docs.filter(d => d.tipo === 'Factura').length,
    boletas:  docs.filter(d => d.tipo === 'Boleta de Honorarios').length,
    nc:       docs.filter(d => d.tipo === 'Nota de Crédito').length,
  }), [docs])

  const pdfUrl = (d: DocItem) =>
    `/api/documents/file?folder=${d.folder}&name=${encodeURIComponent(d.filename)}`

  const filterBtns: { label: string; value: TipoFilter; count: number; color: string }[] = [
    { label: 'Todos',    value: 'todos',                 count: counts.todos,    color: C.textPrimary },
    { label: 'Facturas', value: 'Factura',               count: counts.facturas, color: '#1D4ED8' },
    { label: 'Boletas',  value: 'Boleta de Honorarios',  count: counts.boletas,  color: C.success },
    { label: 'NC',       value: 'Nota de Crédito',       count: counts.nc,       color: C.warning },
  ]

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: C.canvas, overflow: 'hidden',
    }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '14px 14px 0' : '20px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>
              Documentos Tributarios
            </h1>
            {!isMobile && (
              <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textSec }}>
                Facturas y boletas de honorarios 2026
              </p>
            )}
          </div>

          {/* Export CSV */}
          {!loading && filtered.length > 0 && (
            <button
              onClick={() => exportCSV(filtered)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: C.orange, color: '#fff',
                border: 'none',
              }}
            >
              ↓ Exportar CSV
            </button>
          )}
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 14 }}>
          {/* Type filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {filterBtns.map(btn => {
              const isOn = tipoF === btn.value
              return (
                <button key={btn.value} onClick={() => setTipoF(btn.value)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  border: `1px solid ${isOn ? btn.color : C.border}`,
                  background: isOn ? btn.color : C.card,
                  color: isOn ? '#fff' : C.textSec,
                  transition: 'all 0.12s',
                }}>
                  {btn.label}
                  <span style={{
                    background: isOn ? 'rgba(255,255,255,0.25)' : C.listBg,
                    color: isOn ? '#fff' : C.textMuted,
                    borderRadius: 10, padding: '1px 6px', fontSize: 10,
                  }}>
                    {btn.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            style={{
              flex: 1, minWidth: 160, maxWidth: 300,
              padding: '6px 12px', borderRadius: 8, fontSize: 13,
              border: `1px solid ${C.border}`, outline: 'none',
              color: C.textPrimary, background: C.card,
            }}
          />

          {(tipoF !== 'todos' || search) && (
            <span style={{ fontSize: 12, color: C.textMuted }}>
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflow: 'auto',
        margin: isMobile ? '0 14px 14px' : '0 28px 28px',
        border: `1px solid ${C.border}`, borderRadius: 12,
        background: C.card, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>
            Cargando documentos…
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#DC2626', fontSize: 14 }}>
            Error: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>
            No hay documentos que mostrar.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: C.listBg }}>
                <th style={{ ...TH, width: 60 }}>N°</th>
                <th style={{ ...TH, width: 130 }}>Tipo</th>
                <th style={TH}>Descripción</th>
                <th style={{ ...TH, width: 160 }}>Referencia</th>
                <th style={{ ...TH, width: 100 }}>Fecha</th>
                <th style={{ ...TH, width: 80, textAlign: 'right' }}>Tamaño</th>
                <th style={{ ...TH, width: 90, textAlign: 'center' }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, idx) => {
                const badge = tipoBadge(d.tipo)
                return (
                  <tr key={d.id} style={{
                    background: idx % 2 === 0 ? C.card : C.listBg,
                    transition: 'background 0.1s',
                  }}>
                    {/* N° */}
                    <td style={{ ...TD, fontFamily: 'monospace', color: C.textSec }}>
                      {d.numero ?? '—'}
                    </td>

                    {/* Tipo badge */}
                    <td style={TD}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {badge.label === 'NC' ? 'Nota de Crédito' : badge.label}
                      </span>
                    </td>

                    {/* Descripción */}
                    <td style={{ ...TD, maxWidth: 300 }}>
                      <span style={{
                        display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                        title={d.descripcion}
                      >
                        {d.descripcion || '—'}
                      </span>
                    </td>

                    {/* Referencia */}
                    <td style={{ ...TD, color: C.textSec }}>
                      <span style={{
                        display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                        title={d.referencia}
                      >
                        {d.referencia}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td style={{ ...TD, color: C.textSec, whiteSpace: 'nowrap' }}>
                      {fmtDate(d.fecha)}
                    </td>

                    {/* Tamaño */}
                    <td style={{ ...TD, textAlign: 'right', color: C.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {fmtSize(d.sizeKb)}
                    </td>

                    {/* Ver PDF */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <a
                        href={pdfUrl(d)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.border}`,
                          background: C.card, color: C.orange,
                          textDecoration: 'none', whiteSpace: 'nowrap',
                          transition: 'all 0.12s',
                        }}
                      >
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
