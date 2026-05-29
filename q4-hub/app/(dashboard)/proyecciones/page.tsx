export const revalidate = 0

import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate, bestDate } from '@/lib/fmt'
import { T } from '@/lib/theme'
import { StatusBadge } from '@/components/transacciones/StatusBadge'
import { ProyeccionesFilters } from '@/components/proyecciones/ProyeccionesFilters'
import { Pagination } from '@/components/Pagination'
import { ExportButtons } from '@/components/ExportButtons'
import { EditableCell } from '@/components/inline/EditableCell'
import { CecoAutocomplete } from '@/components/inline/CecoAutocomplete'
import { ProveedorAutocomplete } from '@/components/inline/ProveedorAutocomplete'
import { TableSkeleton } from '@/components/Skeleton'
import { TxCardList } from '@/components/mobile/TxCardList'
import { FAB } from '@/components/mobile/FAB'
import { getCompanies, getCecos, getAccounts, getProviders } from '@/lib/maestros-cache'
import type { Prisma } from '@prisma/client'

type SP = Record<string, string | undefined>

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

function buildWhere(sp: SP): Prisma.TransactionWhereInput {
  const { monday, friday } = getWeekRange()
  const from = sp.from ? new Date(sp.from + 'T00:00:00') : monday
  const to = sp.to ? new Date(sp.to + 'T23:59:59') : friday
  return {
    movementType: 'EGRESO',
    paymentDate: { gte: from, lte: to },
    ...(sp.status ? { status: sp.status as 'PAGADO' | 'PENDIENTE' | 'NULO' } : {}),
    ...(sp.companyId ? { companyId: Number(sp.companyId) } : {}),
    ...(sp.costCenterId ? { costCenterId: Number(sp.costCenterId) } : {}),
    ...(sp.accountId ? { accountId: Number(sp.accountId) } : {}),
  }
}

async function TablaProyecciones({ sp }: { sp: SP }) {
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const limit = 100
  const where = buildWhere(sp)

  const [total, pagos, cecos, providers, totalsByStatus] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, skip: (page - 1) * limit, take: limit,
      select: {
        id: true, description: true, paymentDate: true, docDueDate: true, docIssueDate: true,
        createdAt: true, gross: true, status: true, costCenterId: true, providerId: true,
        costCenter: { select: { code: true, name: true } },
        provider: { select: { name: true } },
        company: { select: { name: true } },
        account: { select: { code: true } },
      },
      orderBy: [{ paymentDate: { sort: 'asc', nulls: 'last' } }, { gross: 'desc' }],
    }),
    getCecos(),
    getProviders(),
    prisma.transaction.groupBy({
      by: ['status'], where, _sum: { gross: true }, _count: { _all: true },
    }),
  ])

  const pendiente = totalsByStatus.find(x => x.status === 'PENDIENTE')
  const pagado = totalsByStatus.find(x => x.status === 'PAGADO')
  const nulo = totalsByStatus.find(x => x.status === 'NULO')
  const totalGeneral = pagos.reduce((s, t) => s + Number(t.gross), 0)

  return (
    <>
      {/* KPIs */}
      <div className="q4-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'Total página', value: totalGeneral, count: pagos.length, color: T.textPrimary },
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

      {/* Mobile: cards */}
      <div className="show-mobile" style={{ display: 'none' }}>
        <TxCardList items={pagos.map(p => ({ ...p, movementType: 'EGRESO' as const }))} showType={false} />
      </div>

      {/* Desktop: tabla */}
      <div className="hide-mobile q4-table-wrap q4-scroll-touch" style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'auto',
        boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
      }}>
        <table className="q4-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardHover }}>
              {['Fecha', 'Empresa', 'CeCo', 'Descripción', 'Proveedor', 'Cuenta', 'Bruto', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '10px 8px', textAlign: h === 'Bruto' ? 'right' : 'left',
                  color: T.textMuted, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagos.map((tx, i) => {
              const best = bestDate(tx)
              const paymentDateStr = tx.paymentDate ? tx.paymentDate.toISOString().slice(0, 10) : ''
              return (
                <tr key={tx.id} style={{
                  borderBottom: `1px solid ${T.border}`,
                  background: i % 2 === 0 ? T.card : T.cardHover,
                }}>
                  <td style={{ padding: '2px 4px', fontSize: 12, whiteSpace: 'nowrap' }}>
                    <EditableCell txId={tx.id} field="paymentDate" kind="date"
                      value={paymentDateStr}
                      display={
                        best ? (
                          <span style={{ color: T.orange, fontWeight: 600 }}>
                            {formatDate(best.date)}
                            {best.kind !== 'pago' && (
                              <span style={{ color: T.textMuted, fontSize: 9, marginLeft: 4, fontWeight: 500 }}>
                                ({best.kind})
                              </span>
                            )}
                          </span>
                        ) : null
                      }
                    />
                  </td>
                  <td style={{ padding: '6px 10px', color: T.textSec, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {tx.company.name.split(' ')[0]}
                  </td>
                  <td style={{ padding: '2px 4px' }}>
                    <CecoAutocomplete txId={tx.id}
                      currentCode={tx.costCenter?.code ?? null}
                      currentId={tx.costCenterId ?? null}
                      cecos={cecos.map(c => ({ id: c.id, code: c.code, name: c.name }))} />
                  </td>
                  <td style={{ padding: '2px 4px', maxWidth: 340 }}>
                    <EditableCell txId={tx.id} field="description" kind="text"
                      value={tx.description}
                      display={
                        <span style={{
                          color: T.textPrimary, fontSize: 13,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'block',
                        }} title={tx.description}>
                          {tx.description}
                        </span>
                      }
                    />
                  </td>
                  <td style={{ padding: '2px 4px', maxWidth: 180 }}>
                    <ProveedorAutocomplete txId={tx.id}
                      currentName={tx.provider?.name ?? null}
                      currentId={tx.providerId ?? null}
                      providers={providers.map(p => ({ id: p.id, name: p.name }))} />
                  </td>
                  <td style={{ padding: '6px 10px', color: T.textMuted, fontSize: 12, fontFamily: 'monospace' }}>
                    {tx.account?.code ?? '—'}
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                    <EditableCell txId={tx.id} field="gross" kind="money"
                      value={Number(tx.gross)}
                      align="right" fontWeight={600}
                      display={
                        <span style={{ color: T.textPrimary, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCLP(Number(tx.gross))}
                        </span>
                      }
                    />
                  </td>
                  <td style={{ padding: '6px 10px' }}>
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
        </table>
      </div>
      <Pagination total={total} page={page} limit={limit} />
    </>
  )
}

async function FiltrosWrapper() {
  const [companies, cecos, accounts] = await Promise.all([
    getCompanies(), getCecos(), getAccounts(),
  ])
  const accountsEgreso = accounts.filter(a => a.movementType === 'EGRESO')
  return (
    <ProyeccionesFilters
      companies={companies.map(c => ({ id: c.id, label: c.name }))}
      cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
      accounts={accountsEgreso.map(a => ({ id: a.id, label: `${a.code} · ${a.name}` }))}
    />
  )
}

export default async function ProyeccionesPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const { monday, friday } = getWeekRange()
  const from = sp.from ? new Date(sp.from + 'T00:00:00') : monday
  const to = sp.to ? new Date(sp.to + 'T23:59:59') : friday

  return (
    <div className="q4-page" style={{ padding: 28 }}>
      <div className="q4-content">
        <div className="q4-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="q4-h1" style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>Proyecciones</h1>
            <div style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
              {formatDate(from)} → {formatDate(to)}
            </div>
          </div>
          <div className="hide-mobile q4-export-btns" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportButtons tipo="proyecciones" />
            <Link href={`/transacciones/nueva?movementType=EGRESO`} style={{
              background: T.orange, color: '#fff', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)', whiteSpace: 'nowrap',
            }}>+ Nuevo egreso</Link>
          </div>
        </div>

        <Suspense fallback={<div style={{ height: 75, background: T.card, borderRadius: 12,
          border: `1px solid ${T.border}`, marginBottom: 14 }} />}>
          <FiltrosWrapper />
        </Suspense>

        <Suspense fallback={<TableSkeleton rows={12} />}>
          <TablaProyecciones sp={sp} />
        </Suspense>
      </div>

      <div className="show-mobile" style={{ display: 'none' }}>
        <FAB href="/transacciones/nueva?movementType=EGRESO" />
      </div>
    </div>
  )
}
