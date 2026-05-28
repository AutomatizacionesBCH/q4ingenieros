export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TransaccionForm } from '@/components/transacciones/TransaccionForm'

function toDateInput(d: Date | null): string {
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}

export default async function EditarTransaccionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const txId = Number(id)
  if (!Number.isFinite(txId)) notFound()

  const [tx, companies, cecos, accounts, providers] = await Promise.all([
    prisma.transaction.findUnique({ where: { id: txId } }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true, companyId: true }, orderBy: { code: 'asc' } }),
    prisma.account.findMany({
      select: { id: true, code: true, name: true, movementType: true, categories: { select: { id: true, name: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.provider.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!tx) notFound()

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/transacciones" style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
          ← Transacciones
        </Link>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Editar transacción #{tx.id}
        </h1>
      </div>

      <TransaccionForm
        mode="edit"
        id={tx.id}
        initial={{
          companyId: tx.companyId,
          costCenterId: tx.costCenterId,
          accountId: tx.accountId,
          categoryId: tx.categoryId,
          providerId: tx.providerId,
          movementType: tx.movementType,
          description: tx.description,
          quantity: tx.quantity?.toString() ?? '',
          unitValue: tx.unitValue?.toString() ?? '',
          net: tx.net.toString(),
          tax: tx.tax.toString(),
          gross: tx.gross.toString(),
          paymentDate: toDateInput(tx.paymentDate),
          status: tx.status,
          paymentMethod: tx.paymentMethod ?? '',
          bank: tx.bank ?? '',
          docIssueDate: toDateInput(tx.docIssueDate),
          docDueDate: toDateInput(tx.docDueDate),
          facturaNum: tx.facturaNum ?? '',
          boletaNum: tx.boletaNum ?? '',
          gdNumber: tx.gdNumber ?? '',
          rendicionNum: tx.rendicionNum ?? '',
          currency: tx.currency,
          notes: tx.notes ?? '',
        }}
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}`, companyId: c.companyId }))}
        accounts={accounts}
        providers={providers.map(p => ({ id: p.id, label: p.name }))}
      />
    </div>
  )
}
