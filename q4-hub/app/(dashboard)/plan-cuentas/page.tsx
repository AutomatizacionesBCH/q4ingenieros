export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DeleteMaestroButton } from '@/components/maestros/DeleteMaestroButton'

export default async function PlanCuentasPage() {
  const accounts = await prisma.account.findMany({
    include: {
      categories: { orderBy: { name: 'asc' } },
      _count: { select: { transactions: true } },
    },
    orderBy: { code: 'asc' },
  })

  const ingresos = accounts.filter(a => a.movementType === 'INGRESO')
  const egresos = accounts.filter(a => a.movementType === 'EGRESO')

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Plan de Cuentas
          </h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {accounts.length} cuentas · {ingresos.length} ingresos · {egresos.length} egresos
          </div>
        </div>
        <Link href="/plan-cuentas/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nueva cuenta</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {accounts.map(account => (
          <div key={account.id} style={{
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: account.categories.length ? 12 : 0 }}>
              <Link href={`/plan-cuentas/${account.id}/editar`} style={{
                color: '#E5501E', fontFamily: 'monospace', fontSize: 13, textDecoration: 'none',
              }}>{account.code}</Link>
              <span style={{ color: '#0F1A2E', fontSize: 14, fontWeight: 600 }}>{account.name}</span>
              <span style={{
                background: account.movementType === 'INGRESO' ? '#F0FDF4' : '#FECACA',
                color: account.movementType === 'INGRESO' ? '#16A34A' : '#DC2626',
       