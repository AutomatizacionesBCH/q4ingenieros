/**
 * app/control/page.tsx — Control Ingeniería Q4 2026 (Server Component)
 *
 * Displays monthly billing KPIs, the full RESUMEN table, and the
 * CURSADO-INGRESADO breakdown. All data comes from the Control 2026 Excel file.
 */
import { getControlData } from '@/lib/control-parser'
import type { MonthSummary, CursadoSection } from '@/lib/control-parser'
import { formatCLP } from '@/lib/format'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  canvas:    '#0F1A2E',
  surface:   '#162138',
  card:      '#1D2D47',
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

// ─── Month KPI Card ───────────────────────────────────────────────────────────

function MonthCard({ month }: { month: MonthSummary }) {
  const hasMeta = month.meta !== null && month.meta > 0
  const hasFacturado = month.facturado !== null
  const onTarget = hasMeta && hasFacturado && month.facturado! >= month.meta!
  const facturadoColor = !hasFacturado
    ? C.muted
    : onTarget ? C.success : C.warning

  return (
    <div style={{
      borderRadius: 10, padding: 14,
      background: C.card, border: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
    }}>
      {/* Month name */}
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: C.secondary,
      }}>{month.mes}</span>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Meta</span>
        <span style={{
          fontSize: 13, fontWeight: 600, color: hasMeta ? C.primary : C.muted,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {hasMeta ? formatCLP(month.meta) : '—'}
        </span>
      </div>

      {/* Facturado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Facturado</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: facturadoColor, fontVariantNumeric: 'tabular-nums' }}>
          {hasFacturado ? formatCLP(month.facturado) : '—'}
        </span>
      </div>

      {/* Ingreso */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ingreso Caja</span>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: month.ingreso !== null && month.ingreso > 0 ? C.primary : C.muted,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {month.ingreso !== null ? formatCLP(month.ingreso) : '—'}
        </span>
      </div>

      {/* Eficiencia */}
      {month.eficiencia !== null && month.eficiencia > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Eficiencia</span>
          <span style={{
            fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            color: month.eficiencia >= 90 ? C.success
              : month.eficiencia >= 70 ? C.warning
              : C.danger,
          }}>
            {month.eficiencia.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Resumen Table ─────────────────────────────────────────────────────────────

function ResumenTable({
  summary,
  totals,
}: {
  summary: MonthSummary[]
  totals: { facturado: number | null; ingreso: number | null }
}) {
  const headers = ['Mes', 'Meta', 'Facturado', 'Ingreso Caja', 'Eficiencia']

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.borderSt}` }}>
            {headers.map(h => (
              <th key={h} style={{
                padding: '8px 16px 8px 0', textAlign: 'left',
                color: C.secondary, fontWeight: 600, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.map((row, i) => {
            const hasMeta = row.meta !== null && row.meta > 0
            const hasFacturado = row.facturado !== null
            const onTarget = hasMeta && hasFacturado && row.facturado! >= row.meta!
            const facturadoColor = !hasFacturado ? C.muted : onTarget ? C.success : C.warning

            return (
              <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <td style={{ padding: '7px 16px 7px 0', color: C.primary, fontWeight: 500 }}>{row.mes}</td>
                <td style={{ padding: '7px 16px 7px 0', color: hasMeta ? C.primary : C.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {hasMeta ? formatCLP(row.meta) : '—'}
                </td>
                <td style={{ padding: '7px 16px 7px 0', color: facturadoColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {hasFacturado ? formatCLP(row.facturado) : '—'}
                </td>
                <td style={{ padding: '7px 16px 7px 0', color: row.ingreso !== null && row.ingreso > 0 ? C.primary : C.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {row.ingreso !== null ? formatCLP(row.ingreso) : '—'}
                </td>
                <td style={{ padding: '7px 0', fontVariantNumeric: 'tabular-nums',
                  color: row.eficiencia === null || row.eficiencia === 0 ? C.muted
                    : row.eficiencia >= 90 ? C.success
                    : row.eficiencia >= 70 ? C.warning
                    : C.danger,
                }}>
                  {row.eficiencia !== null && row.eficiencia > 0 ? row.eficiencia.toFixed(1) + '%' : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
        {/* Totals row */}
        <tfoot>
          <tr style={{ borderTop: `1px solid ${C.borderSt}` }}>
            <td style={{ padding: '8px 16px 8px 0', color: C.secondary, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Q4</td>
            <td style={{ padding: '8px 16px 8px 0', color: C.muted }}>—</td>
            <td style={{ padding: '8px 16px 8px 0', color: totals.facturado !== null ? C.primary : C.muted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {totals.facturado !== null ? formatCLP(totals.facturado) : '—'}
            </td>
            <td style={{ padding: '8px 16px 8px 0', color: totals.ingreso !== null ? C.primary : C.muted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {totals.ingreso !== null ? formatCLP(totals.ingreso) : '—'}
            </td>
            <td style={{ padding: '8px 0', color: C.muted }}>—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Cursado Section ──────────────────────────────────────────────────────────

function CursadoSectionCard({ section }: { section: CursadoSection }) {
  return (
    <div style={{
      borderRadius: 10, padding: 14,
      background: C.card, border: `1px solid ${C.border}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.secondary }}>
          {section.label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, fontVariantNumeric: 'tabular-nums' }}>
          {formatCLP(section.total)}
        </span>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {section.items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            gap: 12, padding: '4px 0',
            borderBottom: i < section.items.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none',
          }}>
            <span style={{ color: C.primary, fontSize: 12, flex: 1, minWidth: 0 }}>{item.description}</span>
            <span style={{ color: C.secondary, fontSize: 12, fontVariantNumeric: 'tabular-nums', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {formatCLP(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      borderRadius: 10, padding: 20,
      background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <h2 style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: C.secondary, marginBottom: 14,
      }}>{title}</h2>
      {children}
    </section>
  )
}

// ─── Total KPI Row ────────────────────────────────────────────────────────────

function TotalRow({ totals }: { totals: { facturado: number | null; ingreso: number | null } }) {
  const kpis = [
    { label: 'Facturado Total',    value: totals.facturado, color: C.primary },
    { label: 'Ingreso Caja Total', value: totals.ingreso,   color: C.primary },
    {
      label: 'Eficiencia Global',
      value: totals.facturado && totals.ingreso && totals.facturado > 0
        ? (totals.ingreso / totals.facturado) * 100
        : null,
      isPercent: true,
      color: (() => {
        if (!totals.facturado || !totals.ingreso) return C.muted
        const eff = (totals.ingreso / totals.facturado) * 100
        return eff >= 90 ? C.success : eff >= 70 ? C.warning : C.danger
      })(),
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {kpis.map(kpi => (
        <div key={kpi.label} style={{
          borderRadius: 10, padding: '14px 16px',
          background: C.card, border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{kpi.label}</span>
          <span style={{
            fontSize: '1.5rem', fontWeight: 700,
            color: kpi.value !== null ? kpi.color : C.muted,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            {'isPercent' in kpi && kpi.isPercent
              ? (kpi.value !== null ? kpi.value.toFixed(1) + '%' : '—')
              : (kpi.value !== null ? formatCLP(kpi.value) : '—')
            }
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ControlPage() {
  const data = getControlData()

  // Only show months with at least one non-null value
  const activeMonths = data.summary.filter(
    m => m.meta !== null || m.facturado !== null || m.ingreso !== null,
  )

  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      background: C.canvas,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 40px' }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: C.primary, fontSize: 20, fontWeight: 700, margin: 0 }}>
            Control Ingeniería Q4 2026
          </h1>
          {data.lastUpdate && (
            <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
              Última actualización: {data.lastUpdate}
            </p>
          )}
        </div>

        {/* ── Monthly KPI cards ────────────────────────────────────────── */}
        {activeMonths.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(activeMonths.length, 3)}, 1fr)`,
              gap: 10,
            }}>
              {activeMonths.map((m, i) => (
                <MonthCard key={i} month={m} />
              ))}
            </div>
          </div>
        )}

        {/* ── Total Q4 KPI row ─────────────────────────────────────────── */}
        {(data.totals.facturado !== null || data.totals.ingreso !== null) && (
          <div style={{ marginBottom: 16 }}>
            <TotalRow totals={data.totals} />
          </div>
        )}

        {/* ── Resumen mensual table ────────────────────────────────────── */}
        {data.summary.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Section title="Resumen Mensual">
              <ResumenTable summary={data.summary} totals={data.totals} />
            </Section>
          </div>
        )}

        {/* ── Cursado-Ingresado sections ───────────────────────────────── */}
        {data.cursado.length > 0 && (
          <Section title="Cursado / Ingresado Q4">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {data.cursado.map((section, i) => (
                <CursadoSectionCard key={i} section={section} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {data.summary.length === 0 && data.cursado.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 40, opacity: 0.3, display: 'block', marginBottom: 12 }}>◈</span>
            <p style={{ color: C.muted, fontSize: 14 }}>
              No se encontraron datos en el archivo de control.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
