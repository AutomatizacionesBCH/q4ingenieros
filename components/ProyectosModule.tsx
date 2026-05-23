'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ProjectListItem } from '@/types/ui'
import type { ProjectDetail, EP, ProjectStats } from '@/types/project'

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  canvas:        '#F0F2F6',
  card:          '#FFFFFF',
  border:        '#E2E8F0',
  textPrimary:   '#0F1A2E',
  textSec:       '#64748B',
  textMuted:     '#94A3B8',
  orange:        '#E5501E',
  orangeFaint:   'rgba(229, 80, 30, 0.06)',
  orangeBorder:  'rgba(229, 80, 30, 0.22)',
  success:       '#16A34A',
  successBg:     '#F0FDF4',
  successBorder: '#BBF7D0',
  warning:       '#CA8A04',
  warningBg:     '#FEFCE8',
  warningBorder: '#FDE68A',
  danger:        '#DC2626',
  dangerBg:      '#FEF2F2',
  dangerBorder:  '#FECACA',
  listBg:        '#F8FAFC',
} as const

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCLP(v: number | null | undefined): string {
  if (v == null) return '—'
  return '$ ' + Math.round(v).toLocaleString('es-CL')
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const s = typeof d === 'string' ? d : (d as Date).toISOString()
  const [y, m, day] = s.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

// ─── Status helpers ───────────────────────────────────────────────────────────

interface Badge { color: string; bg: string; border: string; label: string }

function getStatusBadge(status: string, isFinalized: boolean): Badge {
  if (isFinalized)
    return { color: C.success, bg: C.successBg, border: C.successBorder, label: 'Finalizado' }
  const s = status.toLowerCase()
  if (s.includes('revisión') || s.includes('subsanacion') || s.includes('subsanación'))
    return { color: C.warning, bg: C.warningBg, border: C.warningBorder, label: status }
  if (s.includes('proceso') || s.includes('diseño'))
    return { color: C.orange, bg: '#FFF7F4', border: C.orangeBorder, label: status }
  return { color: C.textSec, bg: C.listBg, border: C.border, label: status || 'Sin estado' }
}

function getDotColor(status: string, isFinalized: boolean): string {
  if (isFinalized) return C.success
  const s = status.toLowerCase()
  if (s.includes('revisión') || s.includes('subsanacion')) return C.warning
  if (s.includes('proceso') || s.includes('diseño')) return C.orange
  return C.textMuted
}

function gestionLabel(g: string | null | undefined): string {
  if (g === 'm') return 'Memoria'
  if (g === 'i') return 'Ingeniería'
  if (g === 'e') return 'Especialidades'
  return g ?? '—'
}

// ─── EP Tracker Compact ───────────────────────────────────────────────────────

function EPTrackerCompact({ eps }: { eps: { isPaid: boolean }[] }) {
  if (!eps.length) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
      {eps.map((ep, i) => (
        <div
          key={i}
          title={ep.isPaid ? 'Pagado' : 'Pendiente'}
          style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: ep.isPaid ? C.success : C.orange,
          }}
        />
      ))}
    </div>
  )
}

// ─── EP Tracker Expanded ──────────────────────────────────────────────────────

function EPTrackerExpanded({ eps }: { eps: EP[] }) {
  if (!eps.length)
    return <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Sin estados de pago registrados.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {eps.map((ep, i) => {
        const paid = !!ep.realDate
        return (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '11px 14px', borderRadius: 8,
              background: paid ? C.successBg : C.orangeFaint,
              border: `1px solid ${paid ? C.successBorder : C.orangeBorder}`,
            }}
          >
            <div style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 3,
              background: paid ? C.success : C.orange,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                {ep.label || `EP ${i + 1}`}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                {ep.amount != null && (
                  <span style={{ fontSize: 12, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCLP(ep.amount)}
                  </span>
                )}
                {ep.estimatedDate && (
                  <span style={{ fontSize: 12, color: C.textMuted }}>
                    Est. {fmtDate(ep.estimatedDate)}
                  </span>
                )}
                {ep.realDate && (
                  <span style={{ fontSize: 12, color: C.success, fontWeight: 500 }}>
                    ✓ {fmtDate(ep.realDate)}
                  </span>
                )}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', flexShrink: 0,
              color: paid ? C.success : C.orange,
            }}>
              {paid ? 'Pagado' : 'Pendiente'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Table styles ─────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  fontSize: 10, fontWeight: 700, color: '#94A3B8',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}
const TD: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, color: '#0F1A2E',
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: C.textMuted,
      paddingBottom: 10, marginBottom: 12,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {children}
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase', color: C.textMuted, marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[200, 140, 90, 180, 120, 160].map((w, i) => (
        <div key={i} style={{
          height: 14, width: w, maxWidth: '90%',
          borderRadius: 4, background: C.border, opacity: 0.7,
        }} />
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDetail({ total }: { total: number }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8, color: C.textMuted, padding: 40, textAlign: 'center',
    }}>
      <span style={{ fontSize: 36, opacity: 0.15 }}>⬡</span>
      <span style={{ fontSize: 14 }}>Selecciona un proyecto</span>
      <span style={{ fontSize: 12, opacity: 0.7 }}>
        {total} proyecto{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ detail }: { detail: ProjectDetail }) {
  const totalEgresos = detail.expenses.reduce((s, e) => s + (e.amountNet ?? 0), 0)
  const hasImputaciones = detail.expenses.some(e => e.amountWithTax != null)
  const badge = getStatusBadge(detail.status ?? '', detail.isFinalized)
  const marginPositive = (detail.margin ?? 0) >= 0

  return (
    <div style={{ padding: '20px 24px 32px' }}>
      {/* Header */}
      <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
              #{detail.id}
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.textPrimary, lineHeight: 1.3 }}>
              {detail.name}
            </h2>
            <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>{detail.client}</div>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{
              display: 'inline-flex', padding: '3px 10px', borderRadius: 20,
              fontSize: 11, fontWeight: 600,
              color: badge.color, background: badge.bg,
              border: `1px solid ${badge.border}`,
              whiteSpace: 'nowrap',
            }}>
              {badge.label}
            </span>
            {(detail.scope || detail.managementType) && (
              <span style={{ fontSize: 11, color: C.textMuted }}>
                {[detail.scope, gestionLabel(detail.managementType)].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <KpiCard label="Presupuesto" value={fmtCLP(detail.budget?.net ?? null)} color={C.textPrimary} />
        <KpiCard label="Cobrado"     value={fmtCLP(detail.totalCollected)}       color={C.success} />
        <KpiCard label="Pendiente"   value={fmtCLP(detail.pending)}              color={C.orange} />
        <KpiCard label="Egresos"     value={fmtCLP(totalEgresos || null)}        color={C.danger} />
      </div>

      {/* Margin */}
      {detail.margin != null && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 8, marginBottom: 24,
          background: marginPositive ? C.successBg : C.dangerBg,
          border: `1px solid ${marginPositive ? C.successBorder : C.dangerBorder}`,
        }}>
          <span style={{ fontSize: 12, color: C.textSec }}>Margen de utilidad</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: marginPositive ? C.success : C.danger }}>
            {Math.round(detail.margin * 100)}%
          </span>
        </div>
      )}

      {/* EPs */}
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Estados de Pago ({detail.eps.length})</SectionTitle>
        <EPTrackerExpanded eps={detail.eps} />
      </div>

      {/* Egresos */}
      {detail.expenses.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>Egresos ({detail.expenses.length})</SectionTitle>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.listBg }}>
                  <th style={TH}>Descripción</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Monto Neto</th>
                  {hasImputaciones && <th style={{ ...TH, textAlign: 'right' }}>Con Impuesto</th>}
                </tr>
              </thead>
              <tbody>
                {detail.expenses.map((e, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={TD}>{e.description || '—'}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.danger }}>
                      {fmtCLP(e.amountNet)}
                    </td>
                    {hasImputaciones && (
                      <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.textSec }}>
                        {e.amountWithTax != null ? fmtCLP(e.amountWithTax) : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: C.listBg, borderTop: `2px solid ${C.border}` }}>
                  <td style={{ ...TD, fontWeight: 700 }}>Total</td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: C.danger, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCLP(totalEgresos)}
                  </td>
                  {hasImputaciones && <td style={TD} />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Observations */}
      {detail.observations && (
        <div>
          <SectionTitle>Observaciones</SectionTitle>
          <div style={{
            fontSize: 13, color: C.textSec, lineHeight: 1.65,
            padding: '12px 14px', borderRadius: 8,
            background: C.warningBg, border: `1px solid ${C.warningBorder}`,
          }}>
            {detail.observations}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function ListRow({ p, isSelected, onClick }: {
  p: ProjectListItem
  isSelected: boolean
  onClick: () => void
}) {
  const dot = getDotColor(p.status ?? '', p.isFinalized)
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        width: '100%', textAlign: 'left',
        padding: '10px 14px 10px 11px',
        background: isSelected ? C.orangeFaint : 'transparent',
        borderTop: 'none', borderRight: 'none',
        borderBottom: `1px solid ${C.border}`,
        borderLeft: `3px solid ${isSelected ? C.orange : 'transparent'}`,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.textMuted }}>#{p.id}</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color: C.textPrimary,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
      }}>
        {p.name}
      </div>
      <div style={{
        fontSize: 11, color: C.textSec,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
      }}>
        {p.client}
      </div>
      <EPTrackerCompact eps={p.eps} />
    </button>
  )
}

// ─── Select style ─────────────────────────────────────────────────────────────

const SEL: React.CSSProperties = {
  height: 38, padding: '0 10px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, color: '#0F1A2E',
  background: '#FFFFFF', outline: 'none',
  cursor: 'pointer', flexShrink: 0,
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type StatusF  = 'todos' | 'activos' | 'finalizados'
type GestionF = 'todos' | 'm' | 'i' | 'e'
type AmbitoF  = 'todos' | 'Público' | 'Privado'

// ─── Module (exported) ────────────────────────────────────────────────────────

interface Props {
  projects: ProjectListItem[]
  stats: ProjectStats
}

export function ProyectosModule({ projects, stats }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail]         = useState<ProjectDetail | null>(null)
  const [loading, setLoading]       = useState(false)

  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState<StatusF>('todos')
  const [gestionF, setGestionF] = useState<GestionF>('todos')
  const [ambitoF,  setAmbitoF]  = useState<AmbitoF>('todos')

  const filtered = useMemo(() => projects.filter(p => {
    if (statusF === 'activos'     && p.isFinalized)  return false
    if (statusF === 'finalizados' && !p.isFinalized) return false
    if (gestionF !== 'todos' && p.managementType !== gestionF) return false
    if (ambitoF  !== 'todos' && p.scope !== ambitoF)           return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      )
    }
    return true
  }), [projects, search, statusF, gestionF, ambitoF])

  const isFiltering = !!(search || statusF !== 'todos' || gestionF !== 'todos' || ambitoF !== 'todos')

  const selectProject = useCallback(async (id: number) => {
    if (id === selectedId) return
    setSelectedId(id)
    setDetail(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) setDetail(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }, [selectedId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.canvas }}>

      {/* Page header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.textPrimary }}>Proyectos</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textSec }}>
              Gestión de proyectos de ingeniería vial
            </p>
          </div>
          {/* Stat chips */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {[
              { label: 'Total',       value: stats.total,     color: C.textPrimary },
              { label: 'Activos',     value: stats.active,    color: C.orange },
              { label: 'Finalizados', value: stats.finalized, color: C.success },
            ].map(s => (
              <div key={s.label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 62,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: C.textMuted, fontSize: 14, pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cliente o número..."
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 34, paddingRight: 12,
                height: 38, border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 13, color: C.textPrimary,
                background: C.card, outline: 'none',
              }}
            />
          </div>

          <select value={statusF}  onChange={e => setStatusF(e.target.value as StatusF)}   style={SEL}>
            <option value="todos">Estado: Todos</option>
            <option value="activos">Activos</option>
            <option value="finalizados">Finalizados</option>
          </select>

          <select value={gestionF} onChange={e => setGestionF(e.target.value as GestionF)} style={SEL}>
            <option value="todos">Gestión: Todos</option>
            <option value="m">Memoria</option>
            <option value="i">Ingeniería</option>
            <option value="e">Especialidades</option>
          </select>

          <select value={ambitoF}  onChange={e => setAmbitoF(e.target.value as AmbitoF)}   style={SEL}>
            <option value="todos">Ámbito: Todos</option>
            <option value="Público">Público</option>
            <option value="Privado">Privado</option>
          </select>

          {isFiltering && (
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Split panel */}
      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
        margin: '0 24px 24px',
        border: `1px solid ${C.border}`, borderRadius: 12,
        background: C.card, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {/* List */}
        <div style={{
          width: 300, flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '9px 14px', flexShrink: 0,
            background: C.listBg, borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: C.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {filtered.length} proyectos
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                Sin resultados para los filtros seleccionados
              </div>
            ) : (
              filtered.map(p => (
                <ListRow
                  key={p.id}
                  p={p}
                  isSelected={p.id === selectedId}
                  onClick={() => selectProject(p.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Skeleton />
          ) : detail ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <DetailPanel detail={detail} />
            </div>
          ) : (
            <EmptyDetail total={filtered.length} />
          )}
        </div>
      </div>
    </div>
  )
}
