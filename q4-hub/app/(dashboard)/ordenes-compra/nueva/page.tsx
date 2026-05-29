export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { OCForm } from '@/components/ordenes-compra/OCForm'

export default async function NuevaOCPage() {
  const [companies, cecos, providers] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true, companyId: true }, orderBy: { code: 'asc' } }),
    prisma.provider.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="q4-page" style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/ordenes-compra" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>
          ← Órdenes de Compra
        </Link>
        <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Nueva orden de compra
        </h1>
      </div>

      <OCForm
        mode="create"
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}`, companyId: c.companyId }))}
        providers={providers.map(p => ({ id: p.id, label: p.name }))}
      />
    </div>
  )
}
