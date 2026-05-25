'use client'

import { useState, useEffect, useMemo } from 'react'
import type { PropuestaItem } from '@/lib/propuesta-utils'
import { tipoLabel } from '@/lib/propuesta-utils'
import { useIsMobile } from '@/hooks/useIsMobile'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  canvas:      '#F0F2F6',
  card:        '#FFFFFF',
  border:      '#E2E8F0',
  textPrimary: '#0F1A2E',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  orange:      '#E5501E',
  orangeFaint: 'rgba(229,80,30,0.06)',
  warning:     '#CA8A04',
  warningBg:   '#FEFCE8',
  warningBorder:'#FDE68A',
  listBg:      '#F8FAFC',
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tipoBadge(tipo: string) {
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

function exportCSV(rows: PropuestaItem[]) {
  const header = ['Código','Tipo','Contraparte','Proyecto','Comuna','Especialista']
  const data   = rows.map(p => [
    p.codigo,
    tipoLabel(p.tipo),
    `"${p.contraparte.replace(/"/g, '""')}"`,
    `"${p.proyecto.replace(/"/g, '""')}"`,
    p.comuna ?? '',
    `"${p.especialista.replace(/"/g, '""')}"`,
  ])
  const csv  = [header, ...data].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `propuestas-cierre-${new Date().toISOString().slice(0,10)}.csv`,
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

// ─── Module ───────────────────────────────────────────────────────────────────
export function PropuestasModule() {
  const isMobile = useIsMobile()

  const [propuestas, setPropuestas] = useState<PropuestaItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const [tipoF,  setTipoF]  = useState('todos')
  const [search, setSearch] = useState('')

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/propuestas')
      .then(r => r.json())
      .then((d: { propuestas: PropuestaItem[] }) => {
        setPropuestas(d.propuestas ?? [])
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  // ── Available tipos ───────────────────────────────────────────────────────────
  const tiposDisponibles = useMemo(() => {
    const s = new Set(propuestas.map(p => p.tipo))
    return Array.from(s).sort()
  }, [propuestas])

  // ── Filtered rows ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return propuestas.filter(p => {
      if (tipoF !== 'todos' && p.tipo !== tipoF) return false
      if (search) {
        const q   = search.toLowerCase()
        const hay = [p.contraparte, p.proyecto, p.comuna ?? '', p.especialista, p.codigo]
          .join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [propuestas, tipoF, search])

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>Cargando propuestas…</div>
  }
  if (error) {
    return <div style={{ padding: 40, color: '#DC2626', fontSize: 14 }}>Error: {error}</div>
  }

  return (
    <div style={{ background: C.canvas, minHeight: '100vh', padding: isMobile ? '16px 12px' : '24px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1.2 }}>
            Propuestas de Cierre
          </h1>
          <p style={{ fontSize: 13, color: C.textSec, margin: '4px 0 0' }}>
            {propuestas.length} propuesta{propuestas.length !== 1 ? 's' : ''}
          </p>
        </div>
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

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar contraparte, proyecto, comuna…"
          style={{
            padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`,
            fontSize: 12, outline: 'none', background: C.card, color: C.textPrimary,
            width: isMobile ? '100%' : 260,
          }}
        />
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
        {(tipoF !== 'todos' || search) && (
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
          <div>
            {filtered.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>Sin resultados</div>
            )}
            {filtered.map((p, i) => {
              const badge = tipoBadge(p.tipo)
              return (
                <div key={p.id} style={{ padding: '14px 16px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: 'monospace' }}>{p.codigo}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        {tipoLabel(p.tipo)}
                      </span>
                    </div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: C.orange, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                      Ver PDF ↗
                    </a>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 2 }}>{p.contraparte}</div>
                  <div style={{ fontSize: 12, color: C.textSec, marginBottom: 4, lineHeight: 1.4 }}>{p.proyecto}</div>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{p.comuna ?? '—'}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.listBg }}>
                <th style={TH}>Código</th>
                <th style={TH}>Tipo</th>
                <th style={TH}>Contraparte / Especialista</th>
                <th style={TH}>Proyecto</th>
                <th style={TH}>Comuna</th>
                <th style={{ ...TH, textAlign: 'center' }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...TD, textAlign: 'center', color: C.textMuted, padding: 32 }}>
                    Sin resultados
                  </td>
                </tr>
              )}
              {filtered.map((p, i) => {
                const badge = tipoBadge(p.tipo)
                const rowBg = i % 2 === 0 ? C.card : C.listBg
                return (
                  <tr key={p.id} style={{ background: rowBg }}>
                    <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12, color: C.textSec, whiteSpace: 'nowrap' }}>
                      {p.codigo}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        {tipoLabel(p.tipo)}
                      </span>
                    </td>
                    <td style={{ ...TD, maxWidth: 180 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.contraparte}</div>
                      {p.especialista && p.especialista !== p.contraparte && (
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{p.especialista}</div>
                      )}
                    </td>
                    <td style={{ ...TD, maxWidth: 260 }}>
                      <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}>{p.proyecto}</div>
                    </td>
                    <td style={{ ...TD, fontSize: 12, color: C.textSec, whiteSpace: 'nowrap' }}>
                      {p.comuna ?? '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, fontSize: 11, fontWeight: 600, color: C.orange, textDecoration: 'none' }}>
                        ↗ Abrir
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {filtered.length > 0 && filtered.length !== propuestas.length && (
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ ...TD, textAlign: 'right', fontSize: 11, color: C.textMuted, background: C.listBg }}>
                    Mostrando {filtered.length} de {propuestas.length}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  )
}
