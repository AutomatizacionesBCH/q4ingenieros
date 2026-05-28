export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { TransaccionForm } from '@/components/transacciones/TransaccionForm'

export default async function NuevaTransaccionPage() {
  const [companies, cecos, accounts, providers, pos] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true, companyId: true }, orderBy: { code: 'asc' } }),
    prisma.account.findMany({
      select: { id: true, code: true, name: true, movementType: true, categories: { select: { id: true, name: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.provider.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.purchaseOrder.findMany({
      where: { status: 'ACTIVA' },
      select: { id: true, description: true, companyId: true, providerId: true },
      orderBy: { id: 'desc' },
    }),
  ])

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/transacciones" style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
          ← Transacciones
        </Link>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Nueva transacción
        </h1>
      </div>

      <TransaccionForm
        mode="create"
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}`, companyId: c.companyId }))}
        accounts={accounts}
        providers={providers.map(p => ({ id: p.id, label: p.name }))}
        purchaseOrders={pos.map(p => ({
          id: p.id,
          label: `OC-${String(p.id).padStart(4, '0')} · ${p.description.slice(0, 60)}`,
          companyId: p.companyId,
          providerId: p.providerId,
        }))}
      />
    </div>
  )
}
