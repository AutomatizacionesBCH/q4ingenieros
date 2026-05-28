export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { TransaccionesFilters } from '@/components/transacciones/TransaccionesFilters'
import { StatusBadge } from '@/components/transacciones/StatusBadge'
import { Pagination } from '@/components/Pagination'
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
      include: {
        costCenter: { select: { code: true, name: true } },
        company: { select: { name: true } },
        provider: { select: { name: true } },
        account: { select: { code: true } },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.account.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.transaction.aggregate({ where, _sum: { gross: true, net: true } }),
  ])

  const totalBruto = Number(agg._sum.gross ?? 0)
  const totalNeto = Number(agg._sum.net ?? 0)

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Transacciones
          </h1>
          <div style={{ color: '#8A9BB8', fontSize: 13, marginTop: 4 }}>
            {total.toLocaleString('es-CL')} registros · Neto {formatCLP(totalNeto)} · Bruto {formatCLP(totalBruto)}
          </div>
        </div>
        <Link href="/transacciones/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nueva</Link>
      </div>

      <TransaccionesFilters
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
        accounts={accounts.map(a => ({ id: a.id, label: `${a.code} · ${a.name}` }))}
      />

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Fecha', 'Empresa', 'CeCo', 'Descripción', 'Proveedor', 'Cuenta', 'Neto', 'Estado'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: h === 'Neto' ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, i) => (
              <tr key={tx.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '9px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                  <Link href={`/transacciones/${tx.id}/editar`} style={{ color: '#E5501E', textDecoration: 'none' }}>
                    {formatDate(tx.paymentDate)}
                  </Link>
                </td>
                <td style={{ padding: '9px 14px', color: '#8A9BB8', fontSize: 12 }}>
                  {tx.company.name.split(' ')[0]}
                </td>
                <td style={{ padding: '9px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}
                  title={tx.costCenter?.name ?? ''}>
                  {tx.costCenter?.code ?? '—'}
                </td>
                <td style={{ padding: '9px 14px', color: '#F0EDE8', fontSize: 13, maxWidth: 320,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
                  {tx.description}
                </td>
                <td style={{ padding: '9px 14px', color: '#8A9BB8', fontSize: 12, maxWidth: 180,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.provider?.name ?? ''}>
                  {tx.provider?.name ?? '—'}
                </td>
                <td style={{ padding: '9px 14px', color: '#5A7090', fontSize: 12 }}>
                  {tx.account?.code ?? '—'}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 13,
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: tx.movementType === 'INGRESO' ? '#3D8B5E' : '#F0EDE8' }}>
                    {formatCLP(Number(tx.net))}
                  </span>
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <StatusBadge txId={tx.id} status={tx.status} />
                </td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '40px 14px', textAlign: 'center', color: '#5A7090', fontSize: 13 }}>
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
