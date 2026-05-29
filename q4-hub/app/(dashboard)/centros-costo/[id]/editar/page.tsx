export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CeCoForm } from '@/components/maestros/CeCoForm'

export default async function EditarCeCoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cecoId = Number(id)
  if (!Number.isFinite(cecoId)) notFound()

  const [ceco, companies] = await Promise.all([
    prisma.costCenter.findUnique({ where: { id: cecoId } }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!ceco) notFound()

  return (
    <div className="q4-page" style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/centros-costo" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>
          ← Centros de Costo
        </Link>
        <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Editar {ceco.code}
        </h1>
      </div>

      <CeCoForm
        mode="edit"
        id={ceco.id}
        initial={{
          code: ceco.code,
          name: ceco.name,
          companyId: ceco.companyId,
          projectNumber: ceco.projectNumber ?? '',
          location: ceco.location ?? '',
        }}
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
      />
    </div>
  )
}
