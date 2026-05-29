export const revalidate = 0

import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate, bestDate } from '@/lib/fmt'
import { T } from '@/lib/theme'
import { TransaccionesFilters } from '@/components/transacciones/TransaccionesFilters'
import { StatusBadge } from '@/components/transacciones/StatusBadge'
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

function buildWhere(sp: SP): Prisma.TransactionWhereInput {
  return {
    ...(sp.status ? { status: sp.status as 'PAGADO' | 'PENDIENTE' | 'NULO' } : {}),
    ...(sp.movementType ? { movementType: sp.movementType as 'INGRESO' | 'EGRESO' } : {}),
    ...(sp.companyId ? { companyId: Number(sp.companyId) } : {}),
    ...(sp.costCenterId ? { costCenterId: Number(sp.costCenterId) } : {}),
    ...(sp.accountId ? { accountId: Number(sp.accountId) } : {}),
    ...(sp.from || sp.to ? {
      paymentDate: {
        ...(sp.from ? { gte: new Date(sp.from + 'T00:00:00') } : {}),
        ...(sp.to ? { lte: new Date(sp.to + 'T23:59:59') } : {}),
      },
    } : {}),
    ...(sp.q ? {
      OR: [
        { description: { contains: sp.q, mode: 'insensitive' } },
        { facturaNum: { contains: sp.q, mode: 'insensitive' } },
        { boletaNum: { contains: sp.q, mode: 'insensitive' } },
      ],
    } : {}),
  }
}

async function TablaTransacciones({ sp }: { sp: SP }) {
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const limit = 50
  const where = buildWhere(sp)

  const [total, txs, cecos, providers, agg] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, skip: (page - 1) * limit, take: limit,
      select: {
        id: true, description: true, paymentDate: true, docDueDate: true, docIssueDate: true,
        createdAt: true, net: true, gross: true, status: true, movementType: true,
        costCenterId: true,
        costCenter: { select: { code: true, name: true } },
        company: { select: { name: true } },
        providerId: true,
        provider: { select: { name: true } },
        account: { select: { code: true } },
      },
      orderBy: [{ paymentDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    }),
    getCecos(),
    getProviders(),
    prisma.transaction.aggregate({ where, _sum: { gross: true, net: true } }),
  ])

  const totalBruto = Number(agg._sum.gross ?? 0)
  const totalNeto = Number(agg._sum.net ?? 0)

  return (
    <>
      <div style={{ color: T.textSec, fontSize: 13, marginBottom: 14 }}>
        {total.toLocaleString('es-CL')} registros · Neto {formatCLP(totalNeto)} · Bruto {formatCLP(totalBruto)}
      </div>

      {/* Mobile: cards */}
      <div className="show-mobile" style={{ display: 'none' }}>
        <TxCardList items={txs} />
      </div>

      {/* Desktop: tabla */}
      <div className="hide-mobile q4-table-wrap q4-scroll-touch" style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'auto',
        boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
      }}>
        <table className="q4-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardHover }}>
              {['Fecha', 'Empresa', 'CeCo', 'Descripción', 'Proveedor', 'Cuenta', 'Neto', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '10px 8px', textAlign: h === 'Neto' ? 'right' : 'left',
                  color: T.textMuted, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, i) => {
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
                  <td style={{ padding: '6px 10px', color: T.textSec, fontSize: 12 }}>
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
                    <EditableCell txId={tx.id} field="net" kind="money"
                      value={Number(tx.net)}
                      align="right"
                      color={tx.movementType === 'INGRESO' ? T.success : T.textPrimary}
                      fontWeight={600}
                      display={
                        <span style={{
                          color: tx.movementType === 'INGRESO' ? T.success : T.textPrimary,
                          fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                        }}>
                          {formatCLP(Number(tx.net))}
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
            {txs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '40px 14px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                  Sin transacciones en estos filtros
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
  return (
    <TransaccionesFilters
      companies={companies.map(c => ({ id: c.id, label: c.name }))}
      cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
      accounts={accounts.map(a => ({ id: a.id, label: `${a.code} · ${a.name}` }))}
    />
  )
}

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams

  return (
    <div className="q4-page" style={{ padding: 28 }}>
      <div className="q4-content">
        <div className="q4-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="q4-h1" style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>Transacciones</h1>
            <div className="hide-mobile" style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>
              Click en cualquier celda para editar
            </div>
          </div>
          <div className="hide-mobile q4-export-btns" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportButtons tipo="transacciones" />
            <Link href="/transacciones/nueva" style={{
              background: T.orange, color: '#fff', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)', whiteSpace: 'nowrap',
            }}>+ Nueva</Link>
          </div>
        </div>

        <Suspense fallback={<div style={{ height: 75, background: T.card, borderRadius: 12,
          border: `1px solid ${T.border}`, marginBottom: 14 }} />}>
          <FiltrosWrapper />
        </Suspense>

        <Suspense fallback={<TableSkeleton rows={12} />}>
          <TablaTransacciones sp={sp} />
        </Suspense>
      </div>

      {/* FAB en mobile */}
      <div className="show-mobile" style={{ display: 'none' }}>
        <FAB href="/transacciones/nueva" />
      </div>
    </div>
  )
}
