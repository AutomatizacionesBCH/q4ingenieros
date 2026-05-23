/**
 * app/control/page.tsx — Control Ingeniería Q4 2026 (Server Component)
 */
import { getControlData } from '@/lib/control-parser'
import type { MonthSummary, CursadoSection } from '@/lib/control-parser'
import { formatCLP } from '@/lib/format'

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  canvas:   '#F0F2F6',
  card:     '#FFFFFF',
  border:   '#E2E8F0',
  text:     '#0F1A2E',
  textSec:  '#64748B',
  textMuted:'#94A3B8',
  orange:   '#E5501E',
  success:  '#16A34A',
  successBg:'#F0FDF4',
  warning:  '#CA8A04',
  warningBg:'#FEFCE8',
  danger:   '#DC2626',
  listBg:   '#F8FAFC',
} as const

// ─── Month card ───────────────────────────────────────────────────────────────

function MonthCard({ month }: { month: MonthSummary }) {
  const hasMeta     = month.meta !== null && month.meta > 0
  const hasFacturado = month.facturado !== null
  const onTarget    = hasMeta && hasFacturado && month.facturado! >= month.meta!
  const facturadoColor = !hasFacturado ? C.textMuted : onTarget ? C.success : C.warning

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: C.textSec,
      }}>
        {month.mes}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Meta */}
        <div>
          <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
            Meta
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: hasMeta ? C.text : C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            {hasMeta ? formatCLP(month.meta) : '—'}
          </div>
        </div>

        {/* Facturado */}
        <div>
          <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
            Facturado
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: facturadoColor, fontVariantNumeric: 'tabular-nums' }}>
            {hasFacturado ? formatCLP(month.facturado) : '—'}
          </div>
        </div>

        {/* Ingreso caja */}
        <div>
          <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
            Ingreso Caja
          </div>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: month.ingreso !== null && month.ingreso > 0 ? C.text : C.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {month.ingreso !== null ? formatCLP(month.ingreso) : '—'}
          </div>
        </div>

        {/* Eficiencia */}
        {month.eficiencia !== null && month.eficiencia > 0 && (
          <div>
            <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
              Eficiencia
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: month.eficiencia >= 90 ? C.success
                   : month.eficiencia >= 70 ? C.warning
                   : C.danger,
            }}>
              {month.eficiencia.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Resumen table ────────────────────────────────────────────────────────────

function ResumenTable({
  summary,
  totals,
}: {
  summary: MonthSummary[]
  totals: { facturado: number | null; ingreso: number | null }
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.listBg, borderBottom: `2px solid ${C.border}` }}>
            {['Mes', 'Meta', 'Facturado', 'Ingreso Caja', 'Eficiencia'].map(h => (
              <th key={h} style={{
                padding: '10px 16px 10px 0', textAlign: 'left',
                color: C.textMuted, fontWeight: 700, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.map((row, i) => {
            const hasMeta      = row.meta !== null && row.meta > 0
            const hasFacturado = row.facturado !== null
            const onTarget     = hasMeta && hasFacturado && row.facturado! >= row.meta!
            const facturadoColor = !hasFacturado ? C.textMuted : onTarget ? C.success : C.warning

            return (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 16px 8px 0', color: C.text, fontWeight: 600 }}>
                  {row.mes}
                </td>
                <td style={{ padding: '8px 16px 8px 0', color: hasMeta ? C.text : C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {hasMeta ? formatCLP(row.meta) : '—'}
                </td>
                <td style={{ padding: '8px 16px 8px 0', color: facturadoColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {hasFacturado ? formatCLP(row.facturado) : '—'}
                </td>
                <td style={{ padding: '8px 16px 8px 0', color: row.ingreso !== null && row.ingreso > 0 ? C.text : C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {row.ingreso !== null ? formatCLP(row.ingreso) : '—'}
                </td>
                <td style={{
                  padding: '8px 0', fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  color: row.eficiencia === null || row.eficiencia === 0 ? C.textMuted
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
        <tfoot>
          <tr style={{ borderTop: `2px solid ${C.border}`, background: C.listBg }}>
            <td style={{ padding: '9px 16px 9px 0', color: C.textSec, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total Q4
            </td>
            <td style={{ padding: '9px 16px 9px 0', color: C.textMuted }}>—</td>
            <td style={{ padding: '9px 16px 9px 0', color: totals.facturado != null ? C.text : C.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {totals.facturado != null ? formatCLP(totals.facturado) : '—'}
            </td>
            <td style={{ padding: '9px 16px 9px 0', color: totals.ingreso != null ? C.text : C.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {totals.ingreso != null ? formatCLP(totals.ingreso) : '—'}
            </td>
            <td style={{ padding: '9px 0', color: C.textMuted }}>—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Cursado card ─────────────────────────────────────────────────────────────

function CursadoCard({ section }: { section: CursadoSection }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: C.textSec,
        }}>
          {section.label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.orange, fontVariantNumeric: 'tabular-nums' }}>
          {formatCLP(section.total)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {section.items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
            padding: '5px 0',
            borderBottom: i < section.items.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <span style={{ color: C.text, fontSize: 12, flex: 1, minWidth: 0 }}>{item.description}</span>
            <span style={{ color: C.textSec, fontSize: 12, fontVariantNumeric: 'tabular-nums', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {formatCLP(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '20px 22px',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: C.textMuted,
        marginBottom: 16,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── Total KPI Row ────────────────────────────────────────────────────────────

function TotalRow({ totals }: { totals: { facturado: number | null; ingreso: number | null } }) {
  const eff =
    totals.facturado && totals.ingreso && totals.facturado > 0
      ? (totals.ingreso / totals.facturado) * 100
      : null

  const kpis = [
    { label: 'Facturado Total',    value: totals.facturado, color: C.text,    fmt: (v: number) => formatCLP(v) },
    { label: 'Ingreso Caja Total', value: totals.ingreso,   color: C.text,    fmt: (v: number) => formatCLP(v) },
    {
      label: 'Eficiencia Global', value: eff,
      color: eff == null ? C.textMuted : eff >= 90 ? C.success : eff >= 70 ? C.warning : C.danger,
      fmt: (v: number) => v.toFixed(1) + '%',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {kpis.map(kpi => (
        <div key={kpi.label} style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '18px 20px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {kpi.label}
          </span>
          <span style={{
            fontSize: '1.6rem', fontWeight: 700, lineHeight: 1,
            color: kpi.value != null ? kpi.color : C.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {kpi.value != null ? kpi.fmt(kpi.value) : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ControlPage() {
  const data = getControlData()

  const activeMonths = data.summary.filter(
    m => m.meta !== null || m.facturado !== null || m.ingreso !== null,
  )

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: C.canvas }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>
            Control Ingeniería Q4 2026
          </h1>
          {data.lastUpdate && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMuted }}>
              Última actualización: {data.lastUpdate}
            </p>
          )}
        </div>

        {/* Total KPIs */}
        {(data.totals.facturado !== null || data.totals.ingreso !== null) && (
          <div style={{ marginBottom: 20 }}>
            <TotalRow totals={data.totals} />
          </div>
        )}

        {/* Monthly cards */}
        {activeMonths.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(activeMonths.length, 3)}, 1fr)`,
              gap: 12,
            }}>
              {activeMonths.map((m, i) => (
                <MonthCard key={i} month={m} />
              ))}
            </div>
          </div>
        )}

        {/* Resumen table */}
        {data.summary.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <Card title="Resumen Mensual">
              <ResumenTable summary={data.summary} totals={data.totals} />
            </Card>
          </div>
        )}

        {/* Cursado sections */}
        {data.cursado.length > 0 && (
          <Card title="Cursado / Ingresado Q4">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {data.cursado.map((section, i) => (
                <CursadoCard key={i} section={section} />
              ))}
            </div>
          </Card>
        )}

        {/* Empty */}
        {data.summary.length === 0 && data.cursado.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>◈</span>
            <p style={{ color: C.textMuted, fontSize: 14 }}>
              No se encontraron datos en el archivo de control.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
