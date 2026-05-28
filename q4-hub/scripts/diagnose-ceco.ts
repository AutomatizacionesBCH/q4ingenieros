import { prisma } from '../lib/prisma'

async function main() {
  const total = await prisma.transaction.count()
  const withCeco = await prisma.transaction.count({ where: { costCenterId: { not: null } } })
  const withProv = await prisma.transaction.count({ where: { providerId: { not: null } } })
  const withAcct = await prisma.transaction.count({ where: { accountId: { not: null } } })
  const withDate = await prisma.transaction.count({ where: { paymentDate: { not: null } } })

  const cecoCount = await prisma.costCenter.count()
  const provCount = await prisma.provider.count()
  const acctCount = await prisma.account.count()

  console.log('\n=== DIAGNÓSTICO DE VINCULACIONES ===\n')
  console.log(`Total transacciones: ${total}\n`)
  console.log(`Con CeCo:      ${withCeco.toString().padStart(6)} / ${total} (${((withCeco/total)*100).toFixed(1)}%)`)
  console.log(`Con Proveedor: ${withProv.toString().padStart(6)} / ${total} (${((withProv/total)*100).toFixed(1)}%)`)
  console.log(`Con Cuenta:    ${withAcct.toString().padStart(6)} / ${total} (${((withAcct/total)*100).toFixed(1)}%)`)
  console.log(`Con Fecha:     ${withDate.toString().padStart(6)} / ${total} (${((withDate/total)*100).toFixed(1)}%)`)
  console.log(`\nMaestros existentes en DB:`)
  console.log(`  Centros de Costo: ${cecoCount}`)
  console.log(`  Proveedores:      ${provCount}`)
  console.log(`  Cuentas:          ${acctCount}`)

  // Tx sin fecha
  const noDateSamples = await prisma.transaction.findMany({
    where: { paymentDate: null },
    select: { id: true, description: true, gross: true, createdAt: true },
    take: 5,
  })
  console.log(`\nEjemplos de tx sin fecha (primeras 5):`)
  for (const t of noDateSamples) {
    console.log(`  #${t.id} · ${t.description.slice(0, 60)} · $${Number(t.gross)}`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
