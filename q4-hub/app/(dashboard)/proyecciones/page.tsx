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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
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

      <div style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'auto',
        boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardHover }}>
              {['Fecha', 'Empresa', 'CeCo', 'Descripción', 'Proveedor', 'Cuenta', 'Bruto', 'Estado'].map(h =