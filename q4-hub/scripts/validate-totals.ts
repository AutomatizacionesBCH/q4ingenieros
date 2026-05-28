/**
 * Compara totales Excel vs Base de datos.
 * Uso: npx tsx scripts/validate-totals.ts
 */
import * as XLSX from 'xlsx'
import { prisma } from '../lib/prisma'

const FILE = 'c:/Users/alcha/OneDrive/Desktop/Proyectos IA/Proyecto Q4 Completo/1. Flujo 2024 - 2026 (18-05-2026).xlsx'

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function fmt(n: number): string {
  return '$ ' + Math.round(n).toLocaleString('es-CL')
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  VALIDACIÓN: Excel original vs Base de datos (Supabase)')
  console.log('══════════════════════════════════════════════════════════════\n')

  // ─── EXCEL ────────────────────────────────────────────────────────────
  const wb = XLSX.readFile(FILE, { cellDates: true })

  let excelCount = 0
  let excelNet = 0
  let excelGross = 0
  let excelIngresoNet = 0
  let excelEgresoNet = 0
  const excelByCompany: Record<string, { count: number; net: number; gross: number }> = {}

  for (const sheetName of wb.SheetNames) {
    const sh = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sh, { defval: null })
    for (const r of rows) {
      // Solo filas que tienen monto neto (filtro básico para descartar headers/blancos)
      const net = num(r['Neto'] ?? r['NETO'] ?? r['neto'])
      const gross = num(r['Bruto'] ?? r['BRUTO'] ?? r['bruto'])
      const tipo = String(r['Tipo'] ?? r['TIPO'] ?? r['Movimiento'] ?? '').toUpperCase()
      if (net === 0 && gross === 0) continue
      excelCount++
      excelNet += net
      excelGross += gross
      if (tipo.includes('INGRESO')) excelIngresoNet += net
      if (tipo.includes('EGRESO')) excelEgresoNet += net
      const key = sheetName
      if (!excelByCompany[key]) excelByCompany[key] = { count: 0, net: 0, gross: 0 }
      excelByCompany[key].count++
      excelByCompany[key].net += net
      excelByCompany[key].gross += gross
    }
  }

  console.log('📄 EXCEL')
  console.log(`   Hojas: ${wb.SheetNames.length} → ${wb.SheetNames.join(', ')}`)
  console.log(`   Filas con monto: ${excelCount}`)
  console.log(`   Total Neto:    ${fmt(excelNet)}`)
  console.log(`   Total Bruto:   ${fmt(excelGross)}`)
  console.log(`   ↑ Ingresos:    ${fmt(excelIngresoNet)}`)
  console.log(`   ↓ Egresos:     ${fmt(excelEgresoNet)}`)
  console.log('   Por hoja:')
  for (const [k, v] of Object.entries(excelByCompany)) {
    console.log(`     · ${k.padEnd(22)} ${String(v.count).padStart(6)} filas · neto ${fmt(v.net)}`)
  }

  // ─── DATABASE ─────────────────────────────────────────────────────────
  const dbCount = await prisma.transaction.count()
  const dbAgg = await prisma.transaction.aggregate({
    _sum: { net: true, gross: true },
  })
  const dbByMovement = await prisma.transaction.groupBy({
    by: ['movementType'],
    _sum: { net: true, gross: true },
    _count: { _all: true },
  })
  const dbByStatus = await prisma.transaction.groupBy({
    by: ['status'],
    _sum: { net: true, gross: true },
    _count: { _all: true },
  })
  const dbByCompany = await prisma.transaction.groupBy({
    by: ['companyId'],
    _sum: { net: true, gross: true },
    _count: { _all: true },
  })
  const companies = await prisma.company.findMany({ select: { id: true, name: true } })
  const cmap = new Map(companies.map(c => [c.id, c.name]))

  const dbNet = Number(dbAgg._sum.net ?? 0)
  const dbGross = Number(dbAgg._sum.gross ?? 0)
  const dbIngresoNet = Number(dbByMovement.find(x => x.movementType === 'INGRESO')?._sum.net ?? 0)
  const dbEgresoNet = Number(dbByMovement.find(x => x.movementType === 'EGRESO')?._sum.net ?? 0)

  console.log('\n💾 BASE DE DATOS (Supabase)')
  console.log(`   Transacciones: ${dbCount}`)
  console.log(`   Total Neto:    ${fmt(dbNet)}`)
  console.log(`   Total Bruto:   ${fmt(dbGross)}`)
  console.log(`   ↑ Ingresos:    ${fmt(dbIngresoNet)}`)
  console.log(`   ↓ Egresos:     ${fmt(dbEgresoNet)}`)
  console.log('   Por empresa:')
  for (const r of dbByCompany) {
    console.log(`     · ${(cmap.get(r.companyId) ?? '?').padEnd(22)} ${String(r._count._all).padStart(6)} tx · neto ${fmt(Number(r._sum.net ?? 0))}`)
  }
  console.log('   Por estado:')
  for (const r of dbByStatus) {
    console.log(`     · ${r.status.padEnd(10)} ${String(r._count._all).padStart(6)} tx · bruto ${fmt(Number(r._sum.gross ?? 0))}`)
  }

  // ─── DIFFS ────────────────────────────────────────────────────────────
  console.log('\n🔍 DIFERENCIAS')
  const diffCount = dbCount - excelCount
  const diffNet = dbNet - excelNet
  const diffGross = dbGross - excelGross
  const tag = (n: number) => n === 0 ? '✓' : Math.abs(n) < 1 ? '≈' : '✗'
  console.log(`   ${tag(diffCount)} Cantidad:  Excel ${excelCount} vs DB ${dbCount} → diff ${diffCount}`)
  console.log(`   ${tag(diffNet)} Total Neto:  diff ${fmt(diffNet)}`)
  console.log(`   ${tag(diffGross)} Total Bruto: diff ${fmt(diffGross)}`)

  console.log('\n══════════════════════════════════════════════════════════════\n')
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
