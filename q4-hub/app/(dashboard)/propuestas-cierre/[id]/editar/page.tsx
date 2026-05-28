export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PropuestaForm } from '@/components/propuestas/PropuestaForm'

type ContentJson = {
  items?: { descripcion?: string; monto?: number }[]
  observaciones?: string
}

export default async function EditarPropuestaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pId = Number(id)
  if (!Number.isFinite(pId)) notFound()

  const [propuesta, cecos, providers] = await Promise.all([
    prisma.closingProposal.findUnique({ where: { id: pId } }),
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.provider.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!propuesta) notFound()

  const content = (propuesta.content ?? {}) as ContentJson
  const items = (content.items ?? []).map(it => ({
    descripcion: it.descripcion ?? '',
    monto: it.monto != null ? String(it.monto) : '',
  }))

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/propuestas-cierre" style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
          ← Propuestas de Cierre
        </Link>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Editar PC-{String(propuesta.id).padStart(4, '0')}
        </h1>
      </div>

      <PropuestaForm
        mode="edit"
        id={propuesta.id}
        initial={{
          costCenterId: propuesta.costCenterId,
          providerId: propuesta.providerId,
          description: propuesta.description,
          status: propuesta.status,
          observaciones: content.observaciones ?? '',
          items,
        }}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
        providers={providers.map(p => ({ id: p.id, label: p.name }))}
      />
    </div>
  )
}
