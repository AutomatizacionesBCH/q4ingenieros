import Link from 'next/link'
import { T } from '@/lib/theme'
import { formatCLP } from '@/lib/fmt'

type Row = {
  companyId: number
  name: string
  type: 'PRINCIPAL' | 'TRANSVERSAL'
  splitRatio: number
  saldo: number
  ingresos: number
  egresos: number
  resultado: number
}
type Grupo = { saldo: number; ingresos: number; egresos: number; resultado: number }

function buildHref(companyId: number, params: { month?: string; status?: string }) {
  const q = new URLSearchParams()
  q.set('companyId', String(companyId))
  if (params.month) q.set('month', params.month)
  if (params.status) q.set('status', params.status)
  return `/dashboard?${q.toString()}`
}

const th: React.CSSProperties = {
  padding: '10px 12px', color: T.textMuted, fontSize: 10, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
}

export function DesgloseEmpresaTable({
  rows, grupo, singleCompany, currentParams,
}: {
  rows: Row[]
  grupo: Grupo
  singleCompany?: number
  currentParams: { month?: string; status?: string }
}) {
  const visible = singleCompany ? rows.filter(r => r.companyId === singleCompany) : rows
  const showGrupo = !singleCompany

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 1px 2px rgba(15,26,46,0.04)', overflow: 'hidden',
    }}>
      <div style={{ padding: '18px 24px 12px' }}>
        <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Desglose por empresa
        </div>
        <div style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
          {singleCompany ? 'Empresa seleccionada' : 'Grupo consolidado · período actual'}
        </div>
      </div>
      <div className="q4-table-wrap q4-scroll-touch" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardHover }}>
              <th style={{ ...th, textAlign: 'left' }}>Empresa</th>
              <th style={{ ...th, textAlign: 'right' }}>Saldo</th>
              <th style={{ ...th, textAlign: 'right' }}>Ingresos</th>
              <th style={{ ...th, textAlign: 'right' }}>Egresos</th>
              <th style={{ ...th, textAlign: 'right' }}>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={r.companyId} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.card : T.cardHover }}>
                <td style={{ ...td, textAlign: 'left' }}>
                  <Link href={buildHref(r.companyId, currentParams)} style={{ color: T.orange, textDecoration: 'none', fontWeight: 600 }}>
                    {r.name}
                  </Link>
                  {r.type === 'TRANSVERSAL' && (
                    <span style={{ color: T.textMuted, fontSize: 10, marginLeft: 6 }}>
                      (split {Math.round(r.splitRatio * 100)}%)
                    </span>
                  )}
                </td>
                <td style={{ ...td, textAlign: 'right', color: r.saldo < 0 ? T.danger : T.textPrimary }}>{formatCLP(r.saldo)}</td>
                <td style={{ ...td, textAlign: 'right', color: T.success }}>{formatCLP(r.ingresos)}</td>
                <td style={{ ...td, textAlign: 'right', color: T.orange }}>{formatCLP(r.egresos)}</td>
                <td style={{ ...td, textAlign: 'right', color: r.resultado >= 0 ? T.success : T.danger, fontWeight: 600 }}>{formatCLP(r.resultado)}</td>
              </tr>
            ))}
            {showGrupo && (
              <tr style={{ borderTop: `2px solid ${T.borderStrong}`, background: T.cardHover }}>
                <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: T.textPrimary }}>GRUPO</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: grupo.saldo < 0 ? T.danger : T.textPrimary }}>{formatCLP(grupo.saldo)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: T.success }}>{formatCLP(grupo.ingresos)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: T.orange }}>{formatCLP(grupo.egresos)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: grupo.resultado >= 0 ? T.success : T.danger }}>{formatCLP(grupo.resultado)}</td>
              </tr>
            )}
            {visible.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '24px 12px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>Sin empresas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
