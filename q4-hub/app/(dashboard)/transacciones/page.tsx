export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCLP, formatDate } from '@/lib/fmt'

const STATUS_COLORS: Record<string, string> = {
  PAGADO: '#3D8B5E', PENDIENTE: '#D4A017', NULO: '#5A7090',
}

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1')
  const limit = 100

  const where = {
    ...(sp.status ? { status: sp.status as 'PAGADO' | 'PENDIENTE' | 'NULO' } : {}),
    ...(sp.from ? { paymentDate: { gte: new Date(sp.from) } } : {}),
  }

  const [total, txs] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: {
        costCenter: { select: { code: true, name: true } },
        company: { select: { name: true } },
        provider: { select: { name: true } },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: 0 }}>
          Transacciones
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#8A9BB8', fontSize: 13 }}>{total.toLocaleString('es-CL')} registros</span>
          <Link href="/transacciones/nueva" style={{
            background: '#E5501E', color: '#fff', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
          }}>+ Nueva</Link>
        </div>
      </div>

      <div style={{ background: '#162138', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Fecha', 'Empresa', 'CeCo', 'Descripción', 'Proveedor', 'Neto', 'Estado', 'Método'].map(h => (
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
                <td style={{ padding: '9px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}>
                  {tx.costCenter?.code ?? '—'}
                </td>
                <td style={{ padding: '9px 14px', color: '#F0EDE8', fontSize: 13, maxWidth: 280,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                </td>
                <td style={{ padding: '9px 14px', color: '#8A9BB8', fontSize: 12 }}>
                  {tx.provider?.name ?? '—'}
                </td>
                <td style={{ padding: '9px 14px', color: '#F0EDE8', fontSize: 13,
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {tx.movementType === 'INGRESO'
                    ? <span style={{ color: '#3D8B5E' }}>{formatCLP(Number(tx.net))}</span>
                    : formatCLP(Number(tx.net))
                  }
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{
                    background: STATUS_COLORS[tx.status] + '22',
                    color: STATUS_COLORS[tx.status],
                    borderRadius: 6, padding: '3px 8px',
                    fontSize: 11, fontWeight: 700,
                  }}>{tx.status}</span>
                </td>
                <td style={{ padding: '9px 14px', color: '#5A7090', fontSize: 12 }}>
                  {tx.paymentMethod ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
