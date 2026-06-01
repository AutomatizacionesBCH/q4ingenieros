export const revalidate = 0

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { FacturasFilters } from '@/components/facturas/FacturasFilters'

export default async function FacturasEmitidasPage() {
  const raw = await prisma.issuedInvoice.findMany({
    include: {
      company: { select: { name: true } },
      costCenter: { select: { code: true, name: true } },
    },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  })

  // Serializar Decimal → number y Date → ISO string para el client component
  const facturas = raw.map(f => ({
    id: f.id,
    invoiceNumber: f.invoiceNumber,
    epNumber: f.epNumber,
    issueDate: f.issueDate ? f.issueDate.toISOString() : null,
    paymentDate: f.paymentDate ? f.paymentDate.toISOString() : null,
    amount: Number(f.amount),
    received: Number(f.received),
    status: f.status,
    factoring: f.factoring,
    companyId: f.companyId,
    costCenterId: f.costCenterId,
    company: f.company,
    costCenter: f.costCenter,
  }))

  return (
    <div className="q4-page" style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Facturas Emitidas
          </h1>
        </div>
        <Link href="/facturas-emitidas/nueva" style={{
          background: '#E5501E', color: '#fff', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>+ Nueva factura</Link>
      </div>

      <FacturasFilters facturas={facturas} />
    </div>
  )
}
