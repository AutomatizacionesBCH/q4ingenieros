'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { formatCLP, formatDate, getStatusStyle } from '@/lib/format'
import type { ProjectListItem, EpSlim } from '@/types/ui'
import type { ProjectStats, ProjectDetail, EP, Expense } from '@/types/project'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  canvas:    '#0F1A2E',
  surface:   '#162138',
  card:      '#1D2D47',
  cardHov:   '#243558',
  orange:    '#E5501E',
  primary:   '#F0EDE8',
  secondary: '#8A9BB8',
  muted:     '#5A7090',
  success:   '#3D8B5E',
  warning:   '#D4A017',
  danger:    '#C0392B',
  border:    'rgba(255,255,255,0.08)',
  borderSt:  'rgba(255,255,255,0.13)',
} as const

// ─── EP Tracker — compact dots (list panel) ───────────────────────────────────

function EPTrackerCompact({ eps }: { eps: EpSlim[] }) {
  const visible = eps.slice(0, 8)
  const hasMore = eps.length > 8

  if (eps.length === 0) {
    return <span style={{ color: C.muted, fontSize: 10 }}>Sin EPs</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: C.muted, fontSize: 10, letterSpacing: '0.04em' }}>EPs</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {visible.map((ep, i) => {
          const isPaid   = ep.isPaid
          const hasMonto = ep.amount !== null && ep.amount > 0
          const dotBg    = isPaid ? C.success : hasMonto ? C.orange : 'transparent'
          const dotBorder = !hasMonto ? `1.5px solid ${C.secondary}` : 'none'
          const tooltip = [
            ep.label,
            ep.amount != null ? formatCLP(ep.amount) : null,
            ep.realDate ? `Recibido ${formatDate(ep.realDate)}`
              : ep.estimatedDate ? `Est. ${formatDate(ep.estimatedDate)}`
              : null,
          ].filter(Boolean).join(' · ')

          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <span aria-hidden style={{
                  display: 'inline-block', width: 6, height: 1,
                  background: C.muted, opacity: 0.35,
                }} />
              )}
              <span title={tooltip} aria-label={tooltip} style={{
                display: 'inline-block', width: 8, height: 8,
                borderRadius: '50%', background: dotBg, border: dotBorder,
                flexShrink: 0, cursor: 'default',
              }} />
            </span>
          )
        })}
        {hasMore && <span style={{ color: C.muted, fontSize: 10, marginLeft: 2 }}>…</span>}
      </div>
    </div>
  )
}

// ─── EP Tracker — expanded vertical (detail panel) ────────────────────────────

function EPTrackerExpanded({ eps }: { eps: EP[] }) {
  const epItems = eps.filter(ep => /^(EP|Anticipo)/i.test(ep.label.trim()))

  if (epItems.length === 0) {
    return <p style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>Sin estados de pago registrados.</p>
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical rail */}
      <div style={{
        position: 'absolute', left: 6, top: 12, bottom: 12,
        width: 1, background: C.border,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {epItems.map((ep, i) => {
          const isPaid   = ep.isPaid
          const hasMonto = ep.amount !== null && ep.amount > 0
          const dotColor  = isPaid ? C.success : hasMonto ? C.orange : C.card
          const dotBorder = isPaid ? C.success : hasMonto ? C.orange : C.secondary

          return (
            <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0' }}>
              {/* Milestone dot */}
              <div style={{
                position: 'absolute', left: -20, top: 13,
                width: 12, height: 12, borderRadius: '50%',
                background: dotColor, border: `2px solid ${dotBorder}`,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 12px' }}>
                  <span style={{ color: C.primary, fontSize: 13, fontWeight: 600 }}>{ep.label}</span>
                  {ep.amount !== null && (
                    <span style={{
                      color: isPaid ? C.success : hasMonto ? C.orange : C.secondary,
                      fontSize: 13, fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatCLP(ep.amount)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {isPaid && ep.realDate ? (
                    <span style={{ color: C.success }}>Recibido · {formatDate(ep.realDate)}</span>
                  ) : ep.estimatedDate ? (
                    <span style={{ color: C.orange }}>Estimado · {formatDate(ep.estimatedDate)}</span>
                  ) : (
                    <span style={{ color: C.muted }}>Sin fecha</span>
                  )}
                  {isPaid && ep.estimatedDate && (
                    <span style={{ color: C.muted, marginLeft: 8 }}>est. {formatDate(ep.estimatedDate)}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Expense Table ────────────────────────────────────────────────────────────

function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return <p style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>Sin egresos registrados.</p>
  }

  const total = expenses.reduce((acc, e) => acc + (e.amountNet ?? 0), 0)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Concepto', 'Monto Neto', 'Con Impuesto'].map(h => (
              <th key={h} style={{
                padding: '6px 12px 6px 0', textAlign: 'left',
                color: C.secondary, fontWeight: 500,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expenses.map((e, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '5px 12px 5px 0', color: C.primary }}>{e.description}</td>
              <td style={{ padding: '5px 12px 5px 0', color: e.amountNet ? C.primary : C.muted, fontVariantNumeric: 'tabular-nums' }}>
                {e.amountNet !== null ? formatCLP(e.amountNet) : '—'}
              </td>
              <td style={{ padding: '5px 0', color: e.amountWithTax ? C.secondary : C.muted, fontVariantNumeric: 'tabular-nums' }}>
                {e.amountWithTax !== null ? formatCLP(e.amountWithTax) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        {total > 0 && (
          <tfoot>
            <tr style={{ borderTop: `1px solid ${C.borderSt}` }}>
              <td style={{ paddingTop: 8, color: C.secondary, fontWeight: 600, fontSize: 11 }}>Total egresos</td>
              <td style={{ paddingTop: 8, color: C.danger, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCLP(total)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ─── Tax Table ────────────────────────────────────────────────────────────────

function TaxTable({ expenses }: { expenses: Expense[] }) {
  const taxed = expenses.filter(e => e.amountWithTax !== null)
  if (taxed.length === 0) return null

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Concepto', 'Monto con Impuesto'].map(h => (
              <th key={h} style={{ padding: '6px 12px 6px 0', textAlign: 'left', color: C.secondary, fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {taxed.map((e, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '5px 12px 5px 0', color: C.primary }}>{e.description}</td>
              <td style={{ padding: '5px 0', color: C.secondary, fontVariantNumeric: 'tabular-nums' }}>{formatCLP(e.amountWithTax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Detail Section ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      borderRadius: 10, padding: 16,
      background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <h2 style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: C.secondary, marginBottom: 10,
      }}>{title}</h2>
      {children}
    </section>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[140, 80, 200, 160].map((w, i) => (
        <div key={i} style={{
          height: 14, width: w, borderRadius: 4,
          background: C.card,
          animation: 'pulse 1.4s ease-in-out infinite',
          opacity: 0.7,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </div>
  )
}

// ─── Project Detail Panel ─────────────────────────────────────────────────────

function ProjectDetailPanel({ detail }: { detail: ProjectDetail }) {
  const { color: statusColor, label: statusLabel } = getStatusStyle(detail.status)
  const hasPending = detail.pending !== null && detail.pending > 0
  const hasCollected = detail.totalCollected !== null && detail.totalCollected > 0
  const totalEgresos = detail.expenses.reduce((acc, e) => acc + (e.amountNet ?? 0), 0)
  const hasEgresos = totalEgresos > 0
  const marginPct = detail.margin !== null ? (detail.margin * 100).toFixed(1) + '%' : null
  const hasImputaciones = detail.expenses.some(e => e.amountWithTax !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Project header ───────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ color: C.muted, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>#{detail.id}</span>
          {/* Status badge */}
          <span style={{
            color: statusColor, fontSize: 10, fontWeight: 600,
            padding: '2px 8px', borderRadius: 999,
            background: `${statusColor}18`, border: `1px solid ${statusColor}33`,
          }}>{statusLabel}</span>
          {/* Scope badge */}
          {detail.scope && (
            <span style={{
              color: C.secondary, fontSize: 10, fontWeight: 500,
              padding: '2px 8px', borderRadius: 999,
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
            }}>{detail.scope}</span>
          )}
          {detail.paymentModality && (
            <span style={{ color: C.muted, fontSize: 10 }}>{detail.paymentModality}</span>
          )}
        </div>
        <h1 style={{ color: C.primary, fontSize: 18, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
          {detail.client}
        </h1>
        <p style={{ color: C.secondary, fontSize: 12, marginTop: 2 }}>{detail.name}</p>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* PENDIENTE — spans 2 cols on mobile, 1 on wide */}
        <div style={{
          gridColumn: '1 / -1',
          borderRadius: 10, padding: '14px 16px',
          background: hasPending ? 'rgba(229,80,30,0.07)' : C.surface,
          border: `1px solid ${hasPending ? 'rgba(229,80,30,0.28)' : C.border}`,
          minHeight: 80,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: hasPending ? C.orange : C.secondary,
          }}>Pendiente por cobrar</span>
          <span style={{
            color: hasPending ? C.orange : C.muted,
            fontSize: hasPending ? '1.75rem' : '1.4rem',
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            marginTop: 8,
          }}>
            {detail.pending !== null ? formatCLP(detail.pending) : '—'}
          </span>
        </div>

        {/* Ingresos acumulados */}
        <div style={{ borderRadius: 10, padding: 12, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.secondary }}>Ingresos</span>
          <span style={{ color: hasCollected ? C.primary : C.muted, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {detail.totalCollected !== null ? formatCLP(detail.totalCollected) : '—'}
          </span>
        </div>

        {/* Total egresos */}
        <div style={{ borderRadius: 10, padding: 12, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.secondary }}>Egresos</span>
          <span style={{ color: hasEgresos ? C.danger : C.muted, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {hasEgresos ? formatCLP(totalEgresos) : '—'}
          </span>
        </div>

        {/* Margen */}
        <div style={{ borderRadius: 10, padding: 12, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.secondary }}>Margen</span>
          <span style={{
            fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: detail.margin === null ? C.muted
              : detail.margin < 0 ? C.danger
              : detail.margin > 0.6 ? C.success
              : C.warning,
          }}>
            {marginPct ?? '—'}
          </span>
          {detail.utility !== null && (
            <span style={{ fontSize: 10, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
              {formatCLP(detail.utility)} utilidad
            </span>
          )}
        </div>

        {/* Budget net */}
        {detail.budget.net !== null && (
          <div style={{ borderRadius: 10, padding: 12, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.secondary }}>Presupuesto neto</span>
            <span style={{ color: detail.budget.net ? C.primary : C.muted, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatCLP(detail.budget.net)}
            </span>
          </div>
        )}
      </div>

      {/* ── EP Tracker ─────────────────────────────────────────────── */}
      <Section title="Estados de Pago">
        <EPTrackerExpanded eps={detail.eps} />
      </Section>

      {/* ── Egresos ────────────────────────────────────────────────── */}
      <Section title="Egresos">
        <ExpenseTable expenses={detail.expenses} />
      </Section>

      {/* ── Imputaciones con impuesto ───────────────────────────────── */}
      {hasImputaciones && (
        <Section title="Imputaciones con Impuesto">
          <TaxTable expenses={detail.expenses} />
        </Section>
      )}

      {/* ── Observaciones ─────────────────────────────────────────── */}
      {detail.observations && (
        <Section title="Observaciones">
          <p style={{ color: C.secondary, fontSize: 13, lineHeight: 1.6 }}>{detail.observations}</p>
        </Section>
      )}
    </div>
  )
}

// ─── Left panel list row ──────────────────────────────────────────────────────

function ListRow({
  project,
  isSelected,
  onClick,
}: {
  project: ProjectListItem
  isSelected: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const { color: dotColor } = getStatusStyle(project.status)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', textAlign: 'left',
        padding: '6px 10px',
        background: isSelected ? C.cardHov : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderLeft: `2px solid ${isSelected ? C.orange : 'transparent'}`,
        borderRadius: 0,
        cursor: 'pointer',
        transition: 'background 80ms',
      }}
    >
      {/* Status dot */}
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: dotColor, flexShrink: 0,
      }} />
      {/* ID */}
      <span style={{
        fontSize: 10, color: C.muted, flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
        minWidth: 28,
      }}>#{project.id}</span>
      {/* Client (truncated) */}
      <span style={{
        fontSize: 12, color: isSelected ? C.primary : C.secondary,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1, fontWeight: isSelected ? 600 : 400,
      }}>
        {project.client}
      </span>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  projects: ProjectListItem[]
  stats: ProjectStats
}

export function ProyectosModule({ projects, stats }: Props) {
  const [selectedId, setSelectedId]   = useState<number | null>(null)
  const [detail, setDetail]           = useState<ProjectDetail | null>(null)
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState<'active' | 'all'>('active')
  // Mobile: 'list' or 'detail'
  const [mobileView, setMobileView]   = useState<'list' | 'detail'>('list')

  // Fetch detail when selectedId changes
  const fetchDetail = useCallback(async (id: number) => {
    setLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) {
        const data: ProjectDetail = await res.json()
        setDetail(data)
      } else {
        setDetail(null)
      }
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId !== null) {
      fetchDetail(selectedId)
    }
  }, [selectedId, fetchDetail])

  const handleSelect = (id: number) => {
    setSelectedId(id)
    setMobileView('detail')
  }

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects
      .filter(p => {
        if (filter === 'active' && p.isFinalized) return false
        if (q) {
          return (
            p.client.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            String(p.id).includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        // Active before finalized, then by ID ascending
        if (a.isFinalized !== b.isFinalized) return a.isFinalized ? 1 : -1
        return a.id - b.id
      })
  }, [projects, search, filter])

  // ── Render ────────────────────────────────────────────────────────────────

  const leftPanel = (
    <div
      style={{
        width: 280, minWidth: 280, maxWidth: 280,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
        background: C.surface,
      }}
      className="hidden md:flex"
    >
      {/* Search + filter bar */}
      <div style={{ padding: '10px 10px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <svg
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="12" height="12" viewBox="0 0 16 16" fill="none"
          >
            <circle cx="7" cy="7" r="5.5" stroke={C.muted} strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…"
            style={{
              width: '100%', background: C.card,
              color: C.primary, border: `1px solid ${search ? C.borderSt : C.border}`,
              borderRadius: 6, padding: '5px 28px 5px 26px',
              fontSize: 11, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                color: C.muted, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, padding: 0,
              }}
            >✕</button>
          )}
        </div>

        {/* Filter toggle */}
        <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 6, padding: 3 }}>
          {([['active', 'Activos'], ['all', 'Todos']] as const).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                flex: 1, padding: '3px 0', borderRadius: 4, fontSize: 11,
                fontWeight: 500, cursor: 'pointer', border: 'none',
                background: filter === val ? C.surface : 'transparent',
                color: filter === val ? C.primary : C.secondary,
                transition: 'background 80ms',
              }}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div style={{ padding: '5px 10px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: C.muted }}>
          {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 11, textAlign: 'center', padding: '24px 16px' }}>
            Sin resultados
          </p>
        ) : (
          filtered.map(p => (
            <ListRow
              key={p.id}
              project={p}
              isSelected={p.id === selectedId}
              onClick={() => handleSelect(p.id)}
            />
          ))
        )}
      </div>
    </div>
  )

  const rightPanel = (
    <div
      style={{
        flex: 1, overflowY: 'auto', background: C.canvas,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {selectedId === null ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
        }}>
          <span style={{ fontSize: 32, opacity: 0.3 }}>⬡</span>
          <span style={{ color: C.muted, fontSize: 13 }}>Selecciona un proyecto</span>
        </div>
      ) : loading ? (
        <Skeleton />
      ) : detail ? (
        <div style={{ padding: '16px 20px', maxWidth: 800 }}>
          <ProjectDetailPanel detail={detail} />
        </div>
      ) : (
        <div style={{ padding: 20 }}>
          <p style={{ color: C.muted, fontSize: 13 }}>
            Proyecto #{selectedId} — sin hoja de detalle en el archivo Excel.
          </p>
        </div>
      )}
    </div>
  )

  // ── Mobile layout (stacked with tabs) ────────────────────────────────────
  const mobileListPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="flex md:hidden">
      {/* Mobile search + filter */}
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke={C.muted} strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
            style={{ width: '100%', background: C.card, color: C.primary, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px 5px 26px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 6, padding: 3 }}>
          {([['active', 'Activos'], ['all', 'Todos']] as const).map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ flex: 1, padding: '3px 0', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: filter === val ? C.surface : 'transparent', color: filter === val ? C.primary : C.secondary }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '4px 12px', flexShrink: 0, background: C.surface }}>
        <span style={{ fontSize: 10, color: C.muted }}>{filtered.length} proyectos</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: C.surface }}>
        {filtered.map(p => (
          <ListRow key={p.id} project={p} isSelected={p.id === selectedId} onClick={() => handleSelect(p.id)} />
        ))}
      </div>
    </div>
  )

  const mobileDetailPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="flex md:hidden">
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <button
          onClick={() => setMobileView('list')}
          style={{ color: C.secondary, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Proyectos
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: C.canvas }}>
        {loading ? <Skeleton /> : detail ? (
          <div style={{ padding: '16px 16px', maxWidth: 600 }}>
            <ProjectDetailPanel detail={detail} />
          </div>
        ) : (
          <p style={{ color: C.muted, padding: 20, fontSize: 13 }}>Sin detalle disponible.</p>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, overflow: 'hidden' }}>
      {/* ── Desktop layout ─────────────────────────────────────────── */}
      {leftPanel}
      <div className="hidden md:flex" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {rightPanel}
      </div>

      {/* ── Mobile layout ──────────────────────────────────────────── */}
      {mobileView === 'list' ? mobileListPanel : mobileDetailPanel}
    </div>
  )
}
