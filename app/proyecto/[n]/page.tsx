/**
 * app/proyecto/[n]/page.tsx — Project detail (Server Component)
 *
 * Dense, action-oriented layout. The gestor comes here to act:
 * check pending amount, review EP status, verify expenses.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getProjectDetail } from '@/lib/excel-parser'
import { formatCLP, formatDate, getStatusStyle } from '@/lib/format'
import type { ProjectDetail, EP, Expense } from '@/types/project'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  canvas:   '#0F1A2E',
  surface:  '#162138',
  card:     '#1D2D47',
  orange:   '#E5501E',
  primary:  '#F0EDE8',
  secondary:'#8A9BB8',
  muted:    '#5A7090',
  success:  '#3D8B5E',
  warning:  '#D4A017',
  danger:   '#C0392B',
  border:   'rgba(255,255,255,0.08)',
  borderSt: 'rgba(255,255,255,0.13)',
} as const

// ─── EP Tracker Expanded ──────────────────────────────────────────────────────

function EPTrackerExpanded({ eps }: { eps: EP[] }) {
  const epItems = eps.filter(ep => /^(EP|Anticipo)/i.test(ep.label.trim()))

  if (epItems.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: C.muted }}>
        Sin estados de pago registrados.
      </p>
    )
  }

  return (
    <div className="relative pl-5">
      {/* Vertical road line */}
      <div
        className="absolute left-1.5 top-3 bottom-3 w-px"
        style={{ background: C.border }}
      />

      <div className="space-y-1">
        {epItems.map((ep, i) => {
          const isPaid = ep.isPaid
          const hasMonto = ep.amount !== null && ep.amount > 0
          const dotColor = isPaid ? C.success : hasMonto ? C.orange : C.card
          const dotBorder = isPaid ? C.success : hasMonto ? C.orange : C.secondary

          return (
            <div key={i} className="relative flex items-start gap-3 py-2">
              {/* Hito en la vía */}
              <div
                className="absolute -left-5 top-3 w-3 h-3 rounded-full border-2 shrink-0"
                style={{ background: dotColor, borderColor: dotBorder }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: C.primary }}
                  >
                    {ep.label}
                  </span>
                  {ep.amount !== null && (
                    <span
                      className="text-sm tabular font-bold"
                      style={{ color: isPaid ? C.success : hasMonto ? C.orange : C.secondary }}
                    >
                      {formatCLP(ep.amount)}
                    </span>
                  )}
                </div>

                <div className="text-xs mt-0.5">
                  {isPaid && ep.realDate ? (
                    <span style={{ color: C.success }}>
                      Recibido · {formatDate(ep.realDate)}
                    </span>
                  ) : ep.estimatedDate ? (
                    <span style={{ color: C.orange }}>
                      Estimado · {formatDate(ep.estimatedDate)}
                    </span>
                  ) : (
                    <span style={{ color: C.muted }}>Sin fecha</span>
                  )}
                  {isPaid && ep.estimatedDate && (
                    <span style={{ color: C.muted }} className="ml-2">
                      est. {formatDate(ep.estimatedDate)}
                    </span>
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  color,
  large,
  sub,
}: {
  label: string
  value: string
  color: string
  large?: boolean
  sub?: string
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
      }}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: C.secondary }}>
        {label}
      </span>
      <span
        className="tabular font-bold leading-tight"
        style={{
          color,
          fontSize: large ? '1.5rem' : '1.1rem',
        }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[11px]" style={{ color: C.muted }}>
          {sub}
        </span>
      )}
    </div>
  )
}

// ─── Expense Table ────────────────────────────────────────────────────────────

function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return (
      <p className="text-sm py-3" style={{ color: C.muted }}>
        Sin egresos registrados.
      </p>
    )
  }

  const total = expenses.reduce((acc, e) => acc + (e.amountNet ?? 0), 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Concepto', 'Monto Neto', 'Con Impuesto'].map(h => (
              <th
                key={h}
                className="py-2 pr-4 text-left font-medium"
                style={{ color: C.secondary }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expenses.map((e, i) => (
            <tr
              key={i}
              className="border-b"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
              <td className="py-1.5 pr-4" style={{ color: C.primary }}>
                {e.description}
              </td>
              <td className="py-1.5 pr-4 tabular" style={{ color: e.amountNet ? C.primary : C.muted }}>
                {e.amountNet !== null ? formatCLP(e.amountNet) : '—'}
              </td>
              <td className="py-1.5 tabular" style={{ color: e.amountWithTax ? C.secondary : C.muted }}>
                {e.amountWithTax !== null ? formatCLP(e.amountWithTax) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        {total > 0 && (
          <tfoot>
            <tr style={{ borderTop: `1px solid ${C.borderSt}` }}>
              <td className="pt-2 font-semibold" style={{ color: C.secondary }}>
                Total egresos
              </td>
              <td className="pt-2 tabular font-bold" style={{ color: C.danger }}>
                {formatCLP(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-xl p-5"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <h2
        className="text-[11px] font-bold tracking-widest uppercase mb-3"
        style={{ color: C.secondary }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProyectoDetailPage({
  params,
}: {
  params: Promise<{ n: string }>
}) {
  const { n } = await params
  const id = parseInt(n, 10)

  if (isNaN(id) || id <= 0) notFound()

  // Returns null for project 174 (no sheet) — handled gracefully below
  const project: ProjectDetail | null = getProjectDetail(id)

  // If ID not in Resumen at all, 404
  // (project 174 IS in Resumen so getProjectDetail returns a partial object
  //  but our implementation returns null — that's handled as empty-data display)
  if (!project) {
    // Check if the project exists in the index but has no sheet
    const { getProjectsIndex } = await import('@/lib/excel-parser')
    const { projects } = getProjectsIndex()
    const summary = projects.find(p => p.id === id)

    if (!summary) notFound()

    // Project exists in index but has no detail sheet (e.g. #174)
    return (
      <div className="min-h-screen p-6" style={{ background: C.canvas }}>
        <Link href="/" className="flex items-center gap-1.5 text-xs mb-6 w-fit" style={{ color: C.secondary }}>
          ← Volver a la lista
        </Link>
        <p className="text-sm" style={{ color: C.muted }}>
          Proyecto #{id} — {summary.client}: sin hoja de detalle en el archivo Excel.
        </p>
        <p className="text-xs mt-1" style={{ color: C.muted }}>
          Estado: {summary.status} · {summary.scope ?? 'Sin ámbito'}
        </p>
      </div>
    )
  }

  const { color: statusColor, label: statusLabel } = getStatusStyle(project.status)
  const hasPending = project.pending !== null && project.pending > 0
  const marginPct =
    project.margin !== null
      ? (project.margin * 100).toFixed(1) + '%'
      : '—'

  // Expenses with taxes: only show the section if at least one expense
  // has amountWithTax (indicates new 210+ structure)
  const hasImputaciones = project.expenses.some(e => e.amountWithTax !== null)

  return (
    <div className="min-h-screen" style={{ background: C.canvas }}>
      {/* ── Header bar ───────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-6 py-3 border-b"
        style={{ borderColor: C.border, background: C.surface }}
      >
        <Image src="/logo.jpeg" alt="Q4" width={28} height={28} className="rounded-md" />
        <Link
          href="/"
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: C.secondary }}
        >
          ← Lista de proyectos
        </Link>
        <span style={{ color: C.muted }} className="text-xs">/</span>
        <span className="text-xs" style={{ color: C.primary }}>
          #{project.id}
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* ── Project header ───────────────────────────────────────────── */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs tabular" style={{ color: C.muted }}>
              Proyecto #{project.id}
            </span>
            {/* Status badge */}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: statusColor,
                background: `${statusColor}18`,
                border: `1px solid ${statusColor}33`,
              }}
            >
              {statusLabel}
            </span>
            {/* Scope badge */}
            {project.scope && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  color: C.secondary,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${C.border}`,
                }}
              >
                {project.scope}
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold leading-tight" style={{ color: C.primary }}>
            {project.client}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.secondary }}>
            {project.name}
          </p>
          {project.paymentModality && (
            <p className="text-xs mt-1" style={{ color: C.muted }}>
              Modalidad: {project.paymentModality}
            </p>
          )}
        </div>

        {/* ── KPI Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* PENDIENTE — dominante */}
          <div
            className="col-span-2 md:col-span-1 rounded-xl p-4 flex flex-col gap-1"
            style={{
              background: hasPending ? 'rgba(229,80,30,0.08)' : C.surface,
              border: `1px solid ${hasPending ? 'rgba(229,80,30,0.25)' : C.border}`,
            }}
          >
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: hasPending ? C.orange : C.secondary }}>
              Pendiente por cobrar
            </span>
            <span
              className="tabular font-bold leading-tight"
              style={{
                color: hasPending ? C.orange : C.muted,
                fontSize: '1.6rem',
              }}
            >
              {project.pending !== null ? formatCLP(project.pending) : '—'}
            </span>
          </div>

          <KPICard
            label="Ingresado"
            value={project.totalCollected !== null ? formatCLP(project.totalCollected) : '—'}
            color={project.totalCollected ? C.success : C.muted}
          />
          <KPICard
            label="Presupuesto neto"
            value={project.budget.net !== null ? formatCLP(project.budget.net) : '—'}
            color={project.budget.net ? C.primary : C.muted}
          />
          <KPICard
            label="Margen"
            value={marginPct}
            color={
              project.margin === null
                ? C.muted
                : project.margin < 0
                ? C.danger
                : project.margin > 0.7
                ? C.success
                : C.warning
            }
            sub={
              project.utility !== null
                ? `Utilidad ${formatCLP(project.utility)}`
                : undefined
            }
          />
        </div>

        {/* ── EP Tracker Expandido ─────────────────────────────────────── */}
        <Section title="Estados de Pago">
          <EPTrackerExpanded eps={project.eps} />
        </Section>

        {/* ── Egresos ──────────────────────────────────────────────────── */}
        <Section title="Egresos">
          <ExpenseTable expenses={project.expenses} />
        </Section>

        {/* ── Impuestos — solo para estructura nueva (210+) ────────────── */}
        {hasImputaciones && (
          <Section title="Imputaciones con Impuesto">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Concepto', 'Monto con Impuesto'].map(h => (
                      <th key={h} className="py-2 pr-4 text-left font-medium" style={{ color: C.secondary }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.expenses
                    .filter(e => e.amountWithTax !== null)
                    .map((e, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <td className="py-1.5 pr-4" style={{ color: C.primary }}>{e.description}</td>
                        <td className="py-1.5 tabular" style={{ color: C.secondary }}>
                          {formatCLP(e.amountWithTax)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── Observaciones ─────────────────────────────────────────────── */}
        {project.observations && (
          <Section title="Observaciones">
            <p className="text-sm leading-relaxed" style={{ color: C.secondary }}>
              {project.observations}
            </p>
          </Section>
        )}
      </div>
    </div>
  )
}
