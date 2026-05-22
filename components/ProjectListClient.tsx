'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { formatCLP, formatDate, getStatusStyle, sumPending } from '@/lib/format'
import type { ProjectListItem, EpSlim, SortField, SortDir } from '@/types/ui'
import type { ProjectStats } from '@/types/project'

// ─── Palette constants ────────────────────────────────────────────────────────
const C = {
  canvas:   '#0F1A2E',
  surface:  '#162138',
  card:     '#1D2D47',
  cardHov:  '#243558',
  orange:   '#E5501E',
  primary:  '#F0EDE8',
  secondary:'#8A9BB8',
  muted:    '#5A7090',
  success:  '#3D8B5E',
  warning:  '#D4A017',
  border:   'rgba(255,255,255,0.08)',
  borderSt: 'rgba(255,255,255,0.13)',
} as const

// ─── EP Tracker Compact ───────────────────────────────────────────────────────

function EPTrackerCompact({ eps }: { eps: EpSlim[] }) {
  const visible = eps.slice(0, 8)
  const hasMore = eps.length > 8

  if (eps.length === 0) {
    return (
      <span className="text-xs" style={{ color: C.muted }}>
        Sin EPs
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-[10px] shrink-0 mr-0.5" style={{ color: C.muted }}>
        EPs
      </span>
      <div className="flex items-center">
        {visible.map((ep, i) => {
          const isPaid = ep.isPaid
          const hasMonto = ep.amount !== null && ep.amount > 0
          const dotColor = isPaid ? C.success : hasMonto ? C.orange : 'transparent'
          const dotBorder = hasMonto ? 'none' : `1.5px solid ${C.secondary}`
          const tooltip = [
            ep.label,
            ep.amount ? formatCLP(ep.amount) : null,
            ep.realDate ? `Recibido ${formatDate(ep.realDate)}` : ep.estimatedDate ? `Est. ${formatDate(ep.estimatedDate)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <span key={i} className="flex items-center">
              {i > 0 && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 1,
                    background: C.muted,
                    opacity: 0.4,
                  }}
                />
              )}
              <span
                title={tooltip}
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: dotColor,
                  border: dotBorder,
                  flexShrink: 0,
                  cursor: 'default',
                }}
              />
            </span>
          )
        })}
        {hasMore && (
          <span className="text-[10px] ml-0.5" style={{ color: C.muted }}>
            …
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { color, bg, label } = getStatusStyle(status)
  // Shorten long labels
  const short = label.replace('Subsanación de observaciones', 'Subsanación')
    .replace('En proceso de diseño', 'En diseño')
    .replace('Esperando documentación', 'Esp. documentos')
    .replace('Esperando inicio de contrato', 'Esp. contrato')

  return (
    <span
      className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ color, background: bg, border: `1px solid ${color}22` }}
    >
      {short}
    </span>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onClick,
}: {
  project: ProjectListItem
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const { color: borderColor } = getStatusStyle(project.status)
  const hasPending = project.pending !== null && project.pending > 0

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-lg cursor-pointer transition-colors duration-100 focus:outline-none focus-visible:ring-1"
      style={{
        background: hovered ? C.cardHov : C.card,
        borderLeft: `2px solid ${borderColor}`,
        padding: '10px 12px',
      }}
    >
      {/* Row 1: project number + client + badge */}
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="shrink-0 text-[10px] tabular"
            style={{ color: C.muted }}
          >
            #{project.id}
          </span>
          <span
            className="text-sm font-semibold leading-tight truncate"
            style={{ color: C.primary }}
          >
            {project.client}
          </span>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Row 2: project description */}
      <p
        className="text-xs leading-tight truncate mb-2"
        style={{ color: C.secondary }}
      >
        {project.name || '—'}
      </p>

      {/* Row 3: EP tracker + pending amount */}
      <div className="flex items-center justify-between gap-3">
        <EPTrackerCompact eps={project.eps} />
        <span
          className="text-xs tabular font-semibold shrink-0"
          style={{ color: hasPending ? C.orange : C.muted }}
        >
          {project.pending !== null ? formatCLP(project.pending) : '—'}
        </span>
      </div>
    </article>
  )
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ColumnHeader({
  label,
  count,
  totalPending,
  sort,
  sortDir,
  onSort,
}: {
  label: string
  count: number
  totalPending: number
  sort: SortField
  sortDir: SortDir
  onSort: (field: SortField) => void
}) {
  function SortBtn({
    field,
    children,
  }: {
    field: SortField
    children: React.ReactNode
  }) {
    const active = sort === field
    return (
      <button
        onClick={() => onSort(field)}
        className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
        style={{
          color: active ? C.primary : C.muted,
          background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        }}
      >
        {children}
        {active && (sortDir === 'desc' ? ' ↓' : ' ↑')}
      </button>
    )
  }

  return (
    <div
      className="flex flex-col gap-1.5 pb-2.5 mb-2"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <h2
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ color: C.secondary }}
          >
            {label}
          </h2>
          <span className="text-xs tabular" style={{ color: C.muted }}>
            {count}
          </span>
        </div>
        {totalPending > 0 && (
          <span
            className="text-sm font-bold tabular"
            style={{ color: C.orange }}
          >
            {formatCLP(totalPending)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] mr-1" style={{ color: C.muted }}>
          Ordenar:
        </span>
        <SortBtn field="pending">Pendiente</SortBtn>
        <SortBtn field="client">Cliente</SortBtn>
        <SortBtn field="status">Estado</SortBtn>
      </div>
    </div>
  )
}

// ─── Toggle Button ────────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div
      className="flex rounded-lg p-0.5 gap-0.5"
      style={{ background: C.card }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
          style={{
            background:
              value === opt.value ? C.surface : 'transparent',
            color: value === opt.value ? C.primary : C.secondary,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Unclassified section ─────────────────────────────────────────────────────

function UnclassifiedSection({
  projects,
  onNavigate,
}: {
  projects: ProjectListItem[]
  onNavigate: (id: number) => void
}) {
  const [open, setOpen] = useState(false)
  if (projects.length === 0) return null

  return (
    <section className="px-6 pb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-2 text-left"
      >
        <span
          className="text-[11px] font-bold tracking-widest uppercase"
          style={{ color: C.secondary }}
        >
          Sin clasificar
        </span>
        <span className="text-xs tabular" style={{ color: C.muted }}>
          {projects.length}
        </span>
        <span className="ml-auto text-xs" style={{ color: C.muted }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => onNavigate(p.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  projects: ProjectListItem[]
  stats: ProjectStats
}

export function ProjectListClient({ projects, stats }: Props) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active')
  const [pubSort, setPubSort] = useState<SortField>('pending')
  const [pubSortDir, setPubSortDir] = useState<SortDir>('desc')
  const [privSort, setPrivSort] = useState<SortField>('pending')
  const [privSortDir, setPrivSortDir] = useState<SortDir>('desc')

  const navigate = useCallback(
    (id: number) => router.push(`/proyecto/${id}`),
    [router],
  )

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter(p => {
      if (statusFilter === 'active' && p.isFinalized) return false
      if (q) {
        return (
          p.client.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [projects, search, statusFilter])

  function sortProjects(
    list: ProjectListItem[],
    field: SortField,
    dir: SortDir,
  ): ProjectListItem[] {
    return [...list].sort((a, b) => {
      let cmp = 0
      if (field === 'pending')
        cmp = (b.pending ?? -Infinity) - (a.pending ?? -Infinity)
      else if (field === 'client') cmp = a.client.localeCompare(b.client)
      else if (field === 'status') cmp = a.status.localeCompare(b.status)
      return dir === 'asc' ? -cmp : cmp
    })
  }

  function handleSort(
    setField: (f: SortField) => void,
    setDir: (d: SortDir) => void,
    currentField: SortField,
    currentDir: SortDir,
    newField: SortField,
  ) {
    if (newField === currentField) {
      setDir(currentDir === 'desc' ? 'asc' : 'desc')
    } else {
      setField(newField)
      setDir('desc')
    }
  }

  const publicProjects = useMemo(
    () => sortProjects(filtered.filter(p => p.scope === 'Público'), pubSort, pubSortDir),
    [filtered, pubSort, pubSortDir],
  )
  const privateProjects = useMemo(
    () => sortProjects(filtered.filter(p => p.scope === 'Privado'), privSort, privSortDir),
    [filtered, privSort, privSortDir],
  )
  const unclassified = useMemo(
    () => filtered.filter(p => p.scope === null),
    [filtered],
  )

  const pubPending = useMemo(() => sumPending(publicProjects), [publicProjects])
  const privPending = useMemo(() => sumPending(privateProjects), [privateProjects])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.canvas }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: C.border, background: C.surface }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpeg"
            alt="Q4 Ingenieros"
            width={38}
            height={38}
            className="rounded-md"
            priority
          />
          <div>
            <h1
              className="text-base font-bold leading-tight tracking-tight"
              style={{ color: C.primary }}
            >
              Q4 Ingenieros
            </h1>
            <p className="text-[11px]" style={{ color: C.secondary }}>
              Proyectos de Ingeniería Vial
            </p>
          </div>
        </div>

        {/* Global stats pills */}
        <div className="hidden sm:flex items-center gap-3 text-xs tabular">
          {[
            { label: 'Total', value: stats.total, color: C.primary },
            { label: 'Activos', value: stats.active, color: C.orange },
            { label: 'Finalizados', value: stats.finalized, color: C.success },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1">
              <span style={{ color: s.color }} className="font-semibold text-sm">
                {s.value}
              </span>
              <span style={{ color: C.muted }}>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 px-6 py-2.5 border-b"
        style={{
          borderColor: C.border,
          background: C.surface,
        }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="7" cy="7" r="5.5" stroke="#5A7090" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="#5A7090" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente o proyecto…"
            className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none"
            style={{
              background: C.card,
              color: C.primary,
              border: `1px solid ${search ? C.borderSt : C.border}`,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: C.muted }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filter */}
        <ToggleGroup
          options={[
            { value: 'active', label: 'Activos' },
            { value: 'all', label: 'Todos' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        {/* Result count */}
        <span className="text-xs ml-auto" style={{ color: C.muted }}>
          {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2">
        {/* PÚBLICOS */}
        <section className="flex flex-col px-5 py-4" style={{ borderRight: `1px solid ${C.border}` }}>
          <ColumnHeader
            label="Públicos"
            count={publicProjects.length}
            totalPending={pubPending}
            sort={pubSort}
            sortDir={pubSortDir}
            onSort={f =>
              handleSort(setPubSort, setPubSortDir, pubSort, pubSortDir, f)
            }
          />
          {publicProjects.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: C.muted }}>
              {search ? 'Sin resultados' : 'Sin proyectos públicos'}
            </p>
          ) : (
            <div className="space-y-2 overflow-y-auto">
              {publicProjects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={() => navigate(p.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* PRIVADOS */}
        <section className="flex flex-col px-5 py-4">
          <ColumnHeader
            label="Privados"
            count={privateProjects.length}
            totalPending={privPending}
            sort={privSort}
            sortDir={privSortDir}
            onSort={f =>
              handleSort(setPrivSort, setPrivSortDir, privSort, privSortDir, f)
            }
          />
          {privateProjects.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: C.muted }}>
              {search ? 'Sin resultados' : 'Sin proyectos privados'}
            </p>
          ) : (
            <div className="space-y-2 overflow-y-auto">
              {privateProjects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={() => navigate(p.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Sin clasificar ──────────────────────────────────────────────── */}
      {unclassified.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <UnclassifiedSection
            projects={unclassified}
            onNavigate={navigate}
          />
        </div>
      )}
    </div>
  )
}
