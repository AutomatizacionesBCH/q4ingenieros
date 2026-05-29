export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FacturaForm } from '@/components/facturas/FacturaForm'

function toDateInput(d: Date | null): string {
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}

export default async function EditarFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const fId = Number(id)
  if (!Number.isFinite(fId)) notFound()

  const [f, companies, cecos] = await Promise.all([
    prisma.issuedInvoice.findUnique({ where: { id: fId } }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.costCenter.findMany({ select: { id: true, code: true, name: true, companyId: true }, orderBy: { code: 'asc' } }),
  ])

  if (!f) notFound()

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/facturas-emitidas" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>
          ← Facturas Emitidas
        </Link>
        <h1 style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Editar factura #{f.id}
        </h1>
      </div>

      <FacturaForm
        mode="edit"
        id={f.id}
        initial={{
          companyId: f.companyId,
          costCenterId: f.costCenterId,
          epNumber: f.epNumber ?? '',
          invoiceNumber: f.invoiceNumber ?? '',
          amount: f.amount.toString(),
          received: f.received.toString(),
          issueDate: toDateInput(f.issueDate),
          paymentDate: toDateInput(f.paymentDate),
          status: f.status,
          factoring: f.factoring,
          factoringInterest: f.factoringInterest?.toString() ?? '',
          factoringDueDate: toDateInput(f.factoringDueDate),
          entity: f.entity ?? '',
        }}
        companies={companies.map(c => ({ id: c.id, label: c.name }))}
        cecos={cecos.map(c => ({ id: c.id, label: `${c.code} · ${c.name}`, companyId: c.companyId }))}
      />
    </div>
  )
}
