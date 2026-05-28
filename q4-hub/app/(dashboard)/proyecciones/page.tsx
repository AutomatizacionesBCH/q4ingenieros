export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'
import { MarcarPagadoButton } from '@/components/transacciones/MarcarPagadoButton'
import { ProyeccionesFilters } from '@/components/proyecciones/ProyeccionesFilters'
import type { Prisma } from '@prisma/client'

const STATUS_COLORS: Record<string, string> = {
  PAGADO: '#3D8B5E', PENDIENTE: '#D4A017', NULO: '#5A7090',
}

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

  const [pagos, companies, cecos, accounts, totalsByStatus] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        costCenter: { select: { code: true, name: true } },
        provider: { select: { name: true } },
        company: { select: { name: true } },
        account: { select: { code: true, name: true } },
      },
      orderBy: [{ paymentDate: 'asc' }, { gross: 'desc' }],
    }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.account.findMany({
      where: { movementType: 'EGRESO' },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    }),
    prisma.transaction.groupBy({
      by: ['status'],
      where,
      _sum: { gross: true },
      _count: { _all: true },
    }),
  ])

  const totalGeneral = pagos.reduce((s, t) => s + Number(t.gross), 0)
  const pendiente = totalsByStatus.find(x => x.status === 'PENDIENTE')
  const pagado = totalsByStatus.find(x => x.status === 'PAGADO')
  const nulo = totalsByStatus.find(x => x.status === 'NULO')

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>Proyecciones</h1>
          <div style={{ color: '#8A9BB8', fontSize: 13, marginTop: 4 }}>
            Rango: {formatDate(from)} → {formatDate(to)} · {pagos.length} egresos
          </div>
        </div>
      </div>

      {/* KPIs por estado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'Total rango', value: totalGeneral, count: pagos.length, color: '#F0EDE8' },
          { label: 'Pendiente', value: Number(pendiente?._sum.gross ?? 0), count: pendiente?._count._all ?? 0, color: '#D4A017' },
          { label: 'Pagado', value: Number(pagado?._sum.gross ?? 0), count: pagado?._count._all ?? 0, color: '#3D8B5E' },
          { label: 'Nulo', value: Number(nulo?._sum.gross ?? 0), count: nulo?._count._all ?? 0, color: '#5A7090' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#162138', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px',
          }}>
            <div style={{ color: '#5A7090', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatCLP(k.value)}
            </div>
            <div style={{ color: '#5A7090', fontSize: 11, marginTop: 2 }}>{k.count} tx</div>
          </div>
        ))}
      </div>

      <ProyeccionesFilters
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
        accounts={accounts.map(a => ({ id: a.id, label: `${a.code} · ${a.name}` }))}
      />

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Fecha', 'Empresa', 'CeCo', 'Descripción', 'Proveedor', 'Cuenta', 'Bruto', 'Estado', 'Acción'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px', textAlign: h === 'Bruto' ? 'right' : 'left',
                  color: '#5A7090', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagos.map((tx, i) => (
              <tr key={tx.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}>
                <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                  <a href={`/transacciones/${tx.id}/editar`} style={{ color: '#E5501E', textDecoration: 'none' }}>
                    {formatDate(tx.paymentDate)}
                  </a>
                </td>
                <td style={{ padding: '10px 14px', color: '#8A9BB8', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {tx.company.name.split(' ')[0]}
                </td>
                <td style={{ padding: '10px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {tx.costCenter?.code ?? '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#F0EDE8', fontSize: 13, maxWidth: 320,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
                  {tx.description}
                </td>
                <td style={{ padding: '10px 14px', color: '#8A9BB8', fontSize: 12, maxWidth: 180,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.provider?.name ?? ''}>
                  {tx.provider?.name ?? '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#5A7090', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {tx.account?.code ?? '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#F0EDE8', fontSize: 13,
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatCLP(Number(tx.gross))}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: STATUS_COLORS[tx.status] + '22',
                    color: STATUS_COLORS[tx.status],
                    borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                  }}>{tx.status}</span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                  {tx.status !== 'NULO' && (
                    <MarcarPagadoButton txId={tx.id} currentStatus={tx.status} />
                  )}
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '32px 14px', textAlign: 'center', color: '#5A7090', fontSize: 13 }}>
                  Sin transacciones en este rango
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', background: 'rgba(229,80,30,0.06)' }}>
              <td colSpan={6} style={{ padding: '12px 14px', color: '#8A9BB8', fontSize: 12, fontWeight: 700 }}>TOTAL FILTRADO</td>
              <td style={{ padding: '12px 14px', color: '#E5501E', fontSize: 15,
                textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                {formatCLP(totalGeneral)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
