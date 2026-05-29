export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CuentaForm } from '@/components/maestros/CuentaForm'

export default async function EditarCuentaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const acctId = Number(id)
  if (!Number.isFinite(acctId)) notFound()

  const account = await prisma.account.findUnique({
    where: { id: acctId },
    include: { categories: { orderBy: { name: 'asc' } } },
  })
  if (!account) notFound()

  return (
    <div className="q4-page" style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/plan-cuentas" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>
          ← Plan de Cuentas
        </Link>
        <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Editar {account.code}
        </h1>
      </div>

      <CuentaForm
        mode="edit"
        id={account.id}
        initial={{
          code: account.code,
          name: account.name,
          movementType: account.movementType,
          categories: account.categories.map(c => ({ id: c.id, name: c.name })),
        }}
      />
    </div>
  )
}
