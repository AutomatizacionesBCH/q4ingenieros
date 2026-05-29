export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { CeCoForm } from '@/components/maestros/CeCoForm'

export default async function NuevoCeCoPage() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true }, orderBy: { name: 'asc' },
  })

  return (
    <div className="q4-page" style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/centros-costo" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>
          ← Centros de Costo
        </Link>
        <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
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
