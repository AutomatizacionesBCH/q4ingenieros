export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { CeCoForm } from '@/components/maestros/CeCoForm'

export default async function NuevoCeCoPage() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true }, orderBy: { name: 'asc' },
  })

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/centros-costo" style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
          ← Centros de Costo
        </Link>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Nuevo Centro de Costo
        </h1>
      </div>

      <CeCoForm
        mode="create"
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
      />
    </div>
  )
}
