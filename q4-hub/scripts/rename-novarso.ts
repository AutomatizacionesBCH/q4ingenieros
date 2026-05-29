import { prisma } from '../lib/prisma'

async function main() {
  const result = await prisma.company.updateMany({
    where: { name: { contains: 'Novarso', mode: 'insensitive' } },
    data: { name: 'Nobarso SpA' },
  })
  console.log(`Actualizadas ${result.count} empresa(s)`)

  const companies = await prisma.company.findMany({ select: { id: true, name: true, rut: true } })
  console.log('\nEmpresas actuales:')
  for (const c of companies) console.log(`  ${c.id} · ${c.name} · ${c.rut}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
