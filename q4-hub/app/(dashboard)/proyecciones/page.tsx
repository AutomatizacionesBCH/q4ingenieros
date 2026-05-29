export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate, bestDate } from '@/lib/fmt'
import { T, STATUS_COLOR } from '@/lib/theme'
import { StatusBadge } from '@/components/transacciones/StatusBadge'
import { ProyeccionesFilters } from '@/components/proyecciones/ProyeccionesFilters'
import { Pagination } from '@/components/Pagination'
import { getCompanies, getCecos, getAccounts } from '@/lib/maestros-cache'
import type { Prisma } from '@prisma/client'

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)
  return { monday, friday }
}

export default async function ProyeccionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const { monday, friday } = getWeekRange()
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const limit = 100

  const from = sp.from ? new Date(sp.from + 'T00:00:00') : monday
  const to = sp.to ? new Date(sp.to + 'T23:59:59') : friday
  const status = sp.status as 'PAGADO' | 'PENDIENTE' | 'NULO' | undefined
  const companyId = sp.companyId ? Number(sp.companyId) : undefined
  const costCenterId = sp.costCenterId ? Number(sp.costCenterId) : undefined
  const accountId = sp.accountId ? Number(sp.accountId) : undefined

  const where: Prisma.TransactionWhereInput = {
    movementType: 'EGRESO',
    paymentDate: { gte: from, lte: to },
    ...(status ? { status } : {}),
    ...(companyId ? { companyId } : {}),
    ...(costCenterId ? { costCenterId } : {}),
    ...(accountId ? { accountId } : {}),
  }

  const [total, pagos, companies, cecos, accounts, totalsByStatus] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, skip: (page - 1) * limit, take: limit,
      select: {
        id: true, description: true, paymentDate: true, docDueDate: true, docIssueDate: true,
        createdAt: true, gross: true, status: true,
        costCenter: { select: { code: true, name: true } },
        provider: { select: { name: true } },
        company: { select: { name: true } },
        account: { select: { code: true } },
      },
      orderBy: [{ paymentDate: { sort: 'asc', nulls: 'last' } }, { gross: 'desc' }],
    }),
    getCompanies(), getCecos(), getAccounts(),
    prisma.transaction.groupBy({
      by: ['status'], where, _sum: { gross: true }, _count: { _all: true },
    }),
  ])

  const totalGeneral = pagos.reduce((s, t) => s + Number(t.gross), 0)
  const pendiente = totalsByStatus.find(x => x.status === 'PENDIENTE')
  const pagado = totalsByStatus.find(x => x.status === 'PAGADO')
  const nulo = totalsByStatus.find(x => x.status === 'NULO')
  const accountsEgreso = accounts.filter(a => a.movementType === 'EGRESO')

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h1 style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>Proyecciones</h1>
          <div style={{ color: T.textSec, fontSize: 13, marginTop: 4 }}>
            Rango: {formatDate(from)} → {formatDate(to)} · {total} egresos
          </div>
        </div>
        <Link href={`/transacciones/nueva?movementType=EGRESO`} style={{
          background: T.orange, color: '#fff', borderRadius: 8,
          padding: '9px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}>+ Nuevo egreso</Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'Total rango', value: Number(pagos.reduce((s, t) => s + Number(t.gross), 0)), count: total, color: T.textPrimary },
          { label: 'Pendiente', value: Number(pendiente?._sum.gross ?? 0), count: pendiente?._count._all ?? 0, color: T.warning },
          { label: 'Pagado', value: Number(pagado?._sum.gross ?? 0), count: pagado?._count._all ?? 0, color: T.success },
          { label: 'Nulo', value: Number(nulo?._sum.gross ?? 0), count: nulo?._count._all ?? 0, color: T.textMuted },
        ].map(k => (
          <div key={k.label} style={{
            background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: '14px 18px',
            boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
          }}>
            <div style={{ color: T.textMuted, fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatCLP(k.value)}
            </div>
            <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{k.count} tx</div>
          </div>
        ))}
      </div>

      <ProyeccionesFilters
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
        accounts={accountsEgreso.map(a => ({ id: a.id, label: `${a.code} · ${a.name}` }))}
      />

      <div style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'auto',
        boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardHover }}>
              {['Fecha', 'Empresa', 'CeCo', 'Descripción', 'Proveedor', 'Cuenta', 'Bruto', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: h === 'Bruto' ? 'right' : 'left',
                  color: T.textMuted, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagos.map((tx, i) => {
              const best = bestDate(tx)
              return (
                <tr key={tx.id} style={{
                  borderBottom: `1px solid ${T.border}`,
                  background: i % 2 === 0 ? T.card : T.cardHover,
                }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                    <Link href={`/transacciones/${tx.id}/editar`} style={{ color: T.orange, textDecoration: 'none', fontWeight: 600 }}>
                      {best ? formatDate(best.date) : '—'}
                      {best && best.kind !== 'pago' && (
                        <span style={{ color: T.textMuted, fontSize: 9, marginLeft: 4, fontWeight: 500 }}>
                          ({best.kind})
                        </span>
                      )}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textSec, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {tx.company.name.split(' ')[0]}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.orange, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}
                    title={tx.costCenter?.name ?? ''}>
                    {tx.costCenter?.code ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textPrimary, fontSize: 13, maxWidth: 320,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
                    {tx.description}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textSec, fontSize: 12, maxWidth: 180,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.provider?.name ?? ''}>
                    {tx.provider?.name ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textMuted, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {tx.account?.code ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textPrimary, fontSize: 13,
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {formatCLP(Number(tx.gross))}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge txId={tx.id} status={tx.status} />
                  </td>
                </tr>
              )
            })}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '32px 14px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                  Sin transacciones en este rango
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${T.border}`, background: T.orangeFaint }}>
              <td colSpan={6} style={{ padding: '12px 14px', color: T.textSec, fontSize: 12, fontWeight: 700 }}>TOTAL PÁGINA</td>
              <td style={{ padding: '12px 14px', color: T.orange, fontSize: 15,
                textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                {formatCLP(totalGeneral)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <Pagination total={total} page={page} limit={limit} />
    </div>
  )
}
