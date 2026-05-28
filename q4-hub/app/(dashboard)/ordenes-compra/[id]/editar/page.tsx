export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OCForm } from '@/components/ordenes-compra/OCForm'

export default async function EditarOCPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ocId = Number(id)
  if (!Number.isFinite(ocId)) notFound()

  const [oc, companies, cecos, providers] = await Promise.all([
    prisma.purchaseOrder.findUnique({ where: { id: ocId } }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true, companyId: true }, orderBy: { code: 'asc' } }),
    prisma.provider.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!oc) notFound()

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/ordenes-compra/${oc.id}`} style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
          ← OC-{String(oc.id).padStart(4, '0')}
        </Link>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Editar OC #{oc.id}
        </h1>
      </div>

      <OCForm
        mode="edit"
        id={oc.id}
        initial={{
          companyId: oc.companyId,
          costCenterId: oc.costCenterId,
          providerId: oc.providerId,
          description: oc.description,
          total: oc.total.toString(),
          status: oc.status,
        }}
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}`, companyId: c.companyId }))}
        providers={providers.map(p => ({ id: p.id, label: p.name }))}
      />
    </div>
  )
}
