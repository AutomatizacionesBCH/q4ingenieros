export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PropuestaForm } from '@/components/propuestas/PropuestaForm'

export default async function NuevaPropuestaPage() {
  const [cecos, providers] = await Promise.all([
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.provider.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/propuestas-cierre" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>
          ← Propuestas de Cierre
        </Link>
        <h1 style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Nueva propuesta de cierre
        </h1>
      </div>

      <PropuestaForm
        mode="create"
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
        providers={providers.map(p => ({ id: p.id, label: p.name }))}
      />
    </div>
  )
}
