export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProveedorForm } from '@/components/maestros/ProveedorForm'

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const provId = Number(id)
  if (!Number.isFinite(provId)) notFound()

  const provider = await prisma.provider.findUnique({ where: { id: provId } })
  if (!provider) notFound()

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/proveedores" style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
          ← Proveedores
        </Link>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Editar {provider.name}
        </h1>
      </div>
      <ProveedorForm
        mode="edit"
        id={provider.id}
        initial={{
          name: provider.name,
          rut: provider.rut,
          email: provider.email ?? '',
          phone: provider.phone ?? '',
        }}
      />
    </div>
  )
}
