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

      <div style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'auto',
        boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
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
                          <span