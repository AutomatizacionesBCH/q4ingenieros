export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate, bestDate } from '@/lib/fmt'
import { T, STATUS_COLOR } from '@/lib/theme'
import { TransaccionesFilters } from '@/components/transacciones/TransaccionesFilters'
import { StatusBadge } from '@/components/transacciones/StatusBadge'
import { Pagination } from '@/components/Pagination'
import { getCompanies, getCecos, getAccounts } from '@/lib/maestros-cache'
import type { Prisma } from '@prisma/client'

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const limit = 100

  const where: Prisma.TransactionWhereInput = {
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

  const [total, txs, companies, cecos, accounts, agg] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, skip: (page - 1) * limit, take: limit,
      select: {
        id: true, description: true, paymentDate: true, docDueDate: true, docIssueDate: true,
        createdAt: true, net: true, gross: true, status: true, movementType: true,
        costCenter: { select: { code: true, name: true } },
        company: { select: { name: true } },
        provider: { select: { name: true } },
        account: { select: { code: true } },
      },
      orderBy: [{ paymentDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    }),
    getCompanies(), getCecos(), getAccounts(),
    prisma.transaction.aggregate({ where, _sum: { gross: true, net: true } }),
  ])

  const totalBruto = Number(agg._sum.gross ?? 0)
  const totalNeto = Number(agg._sum.net ?? 0)

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>
            Transacciones
          </h1>
          <div style={{ color: T.textSec, fontSize: 13, marginTop: 4 }}>
            {total.toLocaleString('es-CL')} registros · Neto {formatCLP(totalNeto)} · Bruto {formatCLP(totalBruto)}
          </div>
        </div>
        <Link href="/transacciones/nueva" style={{
          background: T.orange, color: '#fff', borderRadius: 8,
          padding: '9px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}>+ Nueva</Link>
      </div>

      <TransaccionesFilters
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
        accounts={accounts.map(a => ({ id: a.id, label: `${a.code} · ${a.name}` }))}
      />

      <div style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'auto',
        boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardHover }}>
              {['Fecha', 'Empresa', 'CeCo', 'Descripción', 'Proveedor', 'Cuenta', 'Neto', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: h === 'Neto' ? 'right' : 'left',
                  color: T.textMuted, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, i) => {
              const best = bestDate(tx)
              return (
                <tr key={tx.id} style={{
                  borderBottom: `1px solid ${T.border}`,
                  background: i % 2 === 0 ? T.card : T.cardHover,
                }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                    <Link href={`/transacciones/${tx.id}/editar`} style={{
                      color: T.orange, textDecoration: 'none', fontWeight: 600,
                    }}>
                      {best ? formatDate(best.date) : '—'}
                      {best && best.kind !== 'pago' && (
                        <span style={{ color: T.textMuted, fontSize: 9, marginLeft: 4, fontWeight: 500 }}>
                          ({best.kind})
                        </span>
                      )}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textSec, fontSize: 12 }}>
                    {tx.company.name.split(' ')[0]}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace' }}
                    title={tx.costCenter?.name ?? ''}>
                    <Link href={`/flujo-ceco?ceco=${cecos.find(c => c.code === tx.costCenter?.code)?.id ?? ''}`}
                      style={{ color: T.orange, textDecoration: 'none' }}>
                      {tx.costCenter?.code ?? '—'}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textPrimary, fontSize: 13, maxWidth: 340,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
                    {tx.description}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textSec, fontSize: 12, maxWidth: 180,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={tx.provider?.name ?? ''}>
                    {tx.provider?.name ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.textMuted, fontSize: 12, fontFamily: 'monospace' }}>
                    {tx.account?.code ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13,
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                    color: tx.movementType === 'INGRESO' ? T.success : T.textPrimary }}>
                    {formatCLP(Number(tx.net))}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
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
    </div>
  )
}
