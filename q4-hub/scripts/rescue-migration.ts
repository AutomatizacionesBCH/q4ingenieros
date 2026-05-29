/**
 * Rescate de migración: re-importa todo con vinculación correcta.
 * Uso: npx tsx scripts/rescue-migration.ts
 *
 * Lo que hace:
 *  1. Backup de status PAGADO actuales (por descripcion+monto+fecha) → JSON
 *  2. Borra todas las tx
 *  3. Seed maestros con nombres de columna correctos del Excel
 *  4. Re-importa transacciones con CeCo, Cuenta, Categoría, Proveedor vinculados
 *  5. Reaplica status PAGADO si matchea con el backup
 */
import * as XLSX from 'xlsx'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { prisma } from '../lib/prisma'
import type { Prisma } from '@prisma/client'

const FILE = 'c:/Users/alcha/OneDrive/Desktop/Proyectos IA/Proyecto Q4 Completo/1. Flujo 2024 - 2026 (18-05-2026).xlsx'
const BACKUP_FILE = 'c:/Users/alcha/OneDrive/Desktop/Proyectos IA/Proyecto Q4 Completo/tx-status-backup.json'
const BATCH = 500

const parseDate = (v: unknown): Date | null => {
  if (!v) return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    const y = v.getFullYear()
    if (y > 2100) {
      const d = new Date(Math.round((y - 25569) * 86400 * 1000))
      return isNaN(d.getTime()) || d.getFullYear() > 2100 ? null : d
    }
    return y < 1900 ? null : v
  }
  if (typeof v === 'number') {
    if (v < 1) return null
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isNaN(d.getTime()) || d.getFullYear() > 2100 || d.getFullYear() < 1900 ? null : d
  }
  const s = String(v).trim()
  if (!s || s === '0' || s === '00:00:00') return null
  const d = new Date(s)
  if (isNaN(d.getTime()) || d.getFullYear() > 2100 || d.getFullYear() < 1900) return null
  return d
}

const cleanRut = (v: unknown): string | null => {
  if (!v) return null
  const s = String(v).replace(/\./g, '').replace(/-/g, '').trim()
  return s.length >= 7 ? s : null
}

// Empresa según el Excel → company name canónico
function mapEmpresa(raw: string): string {
  const l = raw.toLowerCase().trim()
  if (l.includes('nobarzo') || l.includes('novarso') || l.includes('nobarso')) return 'Nobarso SpA'
  if (l.includes('q4')) return 'Q4 Ingenieros'
  if (l.includes('idq4')) return 'IDQ4 Construcciones'
  if (l.includes('transv')) return 'Transversales'
  return raw.trim()
}

async function main() {
  console.log('🚑 RESCATE DE MIGRACIÓN\n')

  // ─── 1. BACKUP de status manualmente cambiados ──────────────────────
  console.log('1. Backup status de transacciones actuales…')
  const existing = await prisma.transaction.findMany({
    select: { description: true, gross: true, paymentDate: true, status: true },
  })
  const backup = existing.map(t => ({
    key: `${t.description}|${Number(t.gross)}|${t.paymentDate?.toISOString().slice(0, 10) ?? ''}`,
    status: t.status,
  }))
  writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2))
  console.log(`   Backup: ${backup.length} tx en ${BACKUP_FILE}`)

  // ─── 2. BORRAR todo ─────────────────────────────────────────────────
  console.log('\n2. Limpiando DB…')
  await prisma.transaction.deleteMany()
  await prisma.category.deleteMany()
  await prisma.account.deleteMany()
  await prisma.costCenter.deleteMany()
  await prisma.provider.deleteMany()
  console.log('   Tx, categorías, cuentas, CeCos y proveedores eliminados')

  // ─── 3. SEED empresas ───────────────────────────────────────────────
  console.log('\n3. Seed empresas…')
  const empMap = new Map<string, number>()
  for (const [name, rut, type] of [
    ['Nobarso SpA', '76000001-1', 'PRINCIPAL'],
    ['Q4 Ingenieros', '76000004-4', 'PRINCIPAL'],
    ['IDQ4 Construcciones', '76000002-2', 'PRINCIPAL'],
    ['Transversales', '76000003-3', 'TRANSVERSAL'],
  ] as const) {
    const c = await prisma.company.upsert({
      where: { rut },
      update: { name, type },
      create: { name, rut, type },
    })
    empMap.set(name, c.id)
  }
  console.log(`   Empresas: ${empMap.size}`)

  const wb = XLSX.readFile(FILE, { cellDates: true })

  // ─── 4. SEED CeCos ──────────────────────────────────────────────────
  console.log('\n4. Seed Centros de Costo desde "Centros de Costos"…')
  const cecoRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Centros de Costos'])
  let cecoOk = 0
  for (const row of cecoRows) {
    const code = String(row['Código '] ?? row['Código'] ?? '').trim()
    const name = String(row['Centros de costos'] ?? '').trim()
    const empresaRaw = String(row['Empresa'] ?? '').trim()
    if (!code || !name) continue
    const companyName = mapEmpresa(empresaRaw)
    const companyId = empMap.get(companyName) ?? empMap.get('Nobarso SpA')!
    const projectNumber = row['N° Proyecto'] != null ? String(row['N° Proyecto']) : null
    const location = String(row['Ubicación'] ?? '').trim() || null
    await prisma.costCenter.upsert({
      where: { code },
      update: { name, companyId, projectNumber, location },
      create: { code, name, companyId, projectNumber, location },
    })
    cecoOk++
  }
  console.log(`   CeCos: ${cecoOk}`)

  // ─── 5. SEED Cuentas + Categorías ────────────────────────────────────
  console.log('\n5. Seed Cuentas y Categorías desde "Cuenta y Categoria"…')
  const cuentaRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Cuenta y Categoria'])
  // Una "cuenta" se identifica por code+movementType (porque hay códigos que aparecen como Ingreso Y Egreso)
  const accountKey = new Map<string, number>() // `${code}|${mvType}` -> accountId
  let acctOk = 0, catOk = 0
  for (const row of cuentaRows) {
    const code = String(row['Código'] ?? '').trim()
    const name = String(row['Cuenta'] ?? '').trim()
    const catName = String(row['Categoría'] ?? '').trim()
    const mvRaw = String(row['Tipo movimiento'] ?? '').toLowerCase()
    if (!code || !name) continue
    const movementType: 'INGRESO' | 'EGRESO' = mvRaw.includes('ingreso') ? 'INGRESO' : 'EGRESO'
    const key = `${code}|${movementType}`
    let accountId = accountKey.get(key)
    if (!accountId) {
      // Si ya existe esta cuenta con otro mvType, usamos código + sufijo
      const existing = await prisma.account.findUnique({ where: { code: movementType === 'INGRESO' ? `${code}-I` : `${code}-E` } })
        || await prisma.account.findUnique({ where: { code } })
      if (existing && existing.movementType === movementType) {
        accountId = existing.id
      } else {
        const usedCode = await prisma.account.findUnique({ where: { code } })
        const finalCode = usedCode ? `${code}-${movementType === 'INGRESO' ? 'I' : 'E'}` : code
        const created = await prisma.account.create({
          data: { code: finalCode, name, movementType },
        })
        accountId = created.id
      }
      accountKey.set(key, accountId)
      acctOk++
    }
    if (catName) {
      const exists = await prisma.category.findFirst({ where: { name: catName, accountId } })
      if (!exists) {
        await prisma.category.create({ data: { name: catName, accountId } })
        catOk++
      }
    }
  }
  console.log(`   Cuentas: ${acctOk} · Categorías: ${catOk}`)

  // ─── 6. SEED Proveedores desde BD ──────────────────────────────────
  console.log('\n6. Seed Proveedores extraídos de "BD"…')
  const bdRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['BD'])
  const provMap = new Map<string, number>() // rut → id
  const seenRuts = new Set<string>()
  const provQueue: { name: string; rut: string }[] = []
  for (const row of bdRows) {
    const name = String(row['Proveedor'] ?? '').trim()
    const rut = cleanRut(row['Rut'])
    if (!name || !rut || seenRuts.has(rut)) continue
    seenRuts.add(rut)
    provQueue.push({ name, rut })
  }
  // Insert en chunks
  for (let i = 0; i < provQueue.length; i += BATCH) {
    const chunk = provQueue.slice(i, i + BATCH)
    await prisma.provider.createMany({ data: chunk, skipDuplicates: true })
  }
  const allProv = await prisma.provider.findMany({ select: { id: true, rut: true } })
  for (const p of allProv) provMap.set(p.rut, p.id)
  console.log(`   Proveedores: ${allProv.length}`)

  // ─── 7. Pre-load maestros ──────────────────────────────────────────
  const [allCecos, allAccounts] = await Promise.all([
    prisma.costCenter.findMany({ select: { id: true, code: true } }),
    prisma.account.findMany({ select: { id: true, code: true, movementType: true } }),
  ])
  const cecoMap = new Map(allCecos.map(c => [c.code, c.id]))
  const acctIngresoMap = new Map<string, number>()
  const acctEgresoMap = new Map<string, number>()
  for (const a of allAccounts) {
    const cleanCode = a.code.replace(/-[IE]$/, '')
    if (a.movementType === 'INGRESO') acctIngresoMap.set(cleanCode, a.id)
    else acctEgresoMap.set(cleanCode, a.id)
  }

  // Categorías map: key = `${accountId}|${categoryName.toLowerCase()}` → id
  const allCats = await prisma.category.findMany({ select: { id: true, name: true, accountId: true } })
  const catMap = new Map(allCats.map(c => [`${c.accountId}|${c.name.toLowerCase()}`, c.id]))

  // ─── 8. Re-importar transacciones con vinculación ──────────────────
  console.log('\n8. Re-importando transacciones con vinculación…')
  const backupMap = new Map<string, string>()
  if (existsSync(BACKUP_FILE)) {
    const raw = JSON.parse(readFileSync(BACKUP_FILE, 'utf-8')) as { key: string; status: string }[]
    for (const b of raw) backupMap.set(b.key, b.status)
  }

  const batch: Prisma.TransactionCreateManyInput[] = []
  let ok = 0, skipped = 0, withCeco = 0, withProv = 0, withAcct = 0
  const flush = async () => {
    if (batch.length === 0) return
    await prisma.transaction.createMany({ data: batch, skipDuplicates: true })
    ok += batch.length
    batch.length = 0
    if (ok % 2000 === 0 || ok >= bdRows.length) console.log(`   ${ok}/${bdRows.length}…`)
  }

  for (const row of bdRows) {
    try {
      const empresaRaw = String(row['Empresa'] ?? '').trim()
      const companyName = mapEmpresa(empresaRaw)
      const companyId = empMap.get(companyName) ?? empMap.get('Nobarso SpA')!

      const cecoCode = String(row['Código ceco'] ?? '').trim()
      const costCenterId = cecoCode ? (cecoMap.get(cecoCode) ?? null) : null
      if (costCenterId) withCeco++

      const mvRaw = String(row['Movimiento'] ?? '').toLowerCase()
      const movementType: 'INGRESO' | 'EGRESO' = mvRaw.includes('ingreso') ? 'INGRESO' : 'EGRESO'

      const acctCode = String(row['Código cta'] ?? '').trim()
      const accountMap = movementType === 'INGRESO' ? acctIngresoMap : acctEgresoMap
      const accountId = acctCode ? (accountMap.get(acctCode) ?? null) : null
      if (accountId) withAcct++

      const catName = String(row['Categorias'] ?? '').trim()
      const categoryId = accountId && catName
        ? (catMap.get(`${accountId}|${catName.toLowerCase()}`) ?? null)
        : null

      const provRut = cleanRut(row['Rut'])
      const providerId = provRut ? (provMap.get(provRut) ?? null) : null
      if (providerId) withProv++

      const net = parseFloat(String(row['Neto'] ?? '0').replace(/[^0-9.-]/g, '')) || 0
      const tax = parseFloat(String(row['Impuesto'] ?? '0').replace(/[^0-9.-]/g, '')) || 0
      const gross = parseFloat(String(row['Bruto'] ?? '').replace(/[^0-9.-]/g, '')) || net + tax

      const statusRaw = String(row['Estado'] ?? '').toLowerCase()
      let status: 'PAGADO' | 'PENDIENTE' | 'NULO' = statusRaw.includes('pagado') ? 'PAGADO'
        : statusRaw.includes('nulo') ? 'NULO' : 'PENDIENTE'

      const paymentDate = parseDate(row['Fecha de pago'])
      const description = String(row['Descripción'] ?? '').trim() || '(sin descripción)'

      // Reaplicar status del backup si matchea
      const bkKey = `${description}|${gross}|${paymentDate?.toISOString().slice(0, 10) ?? ''}`
      const bkStatus = backupMap.get(bkKey)
      if (bkStatus && (bkStatus === 'PAGADO' || bkStatus === 'PENDIENTE' || bkStatus === 'NULO')) {
        status = bkStatus
      }

      const bankRaw = String(row['Banco pagador'] ?? '')
      const bank = bankRaw.includes('Chile') ? 'CHILE'
        : bankRaw.includes('BCI') ? 'BCI'
        : bankRaw.includes('Itaú') || bankRaw.includes('Itau') ? 'ITAU'
        : bankRaw.includes('Santander') ? 'SANTANDER' : null

      const pmRaw = String(row['Modalidad de pagos'] ?? '')
      const paymentMethod = pmRaw.includes('Transfer') ? 'TRANSFERENCIA'
        : pmRaw.includes('Cheque') ? 'CHEQUE'
        : pmRaw.toLowerCase().includes('tarjeta') ? 'TARJETA_CREDITO' : null

      batch.push({
        companyId,
        costCenterId,
        accountId,
        categoryId,
        providerId,
        movementType,
        description,
        quantity: parseFloat(String(row['Cantidad'] ?? '').replace(/[^0-9.-]/g, '')) || null,
        unitValue: parseFloat(String(row[' Valor x UM '] ?? row['Valor x UM'] ?? '').replace(/[^0-9.-]/g, '')) || null,
        net,
        tax,
        gross,
        paymentDate,
        status,
        paymentMethod: paymentMethod as 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA_CREDITO' | null,
        bank: bank as 'CHILE' | 'BCI' | 'ITAU' | 'SANTANDER' | null,
        docIssueDate: parseDate(row['Fecha emisión Boletas/Facturas']),
        docDueDate: parseDate(row['Fecha vencimiento Factura']),
        boletaNum: String(row['Boleta'] ?? '').trim() || null,
        facturaNum: String(row['Factura'] ?? '').trim() || null,
        gdNumber: String(row['GD N°'] ?? '').trim() || null,
        rendicionNum: String(row['Rendición N°'] ?? '').trim() || null,
      })

      if (batch.length >= BATCH) await flush()
    } catch (e) {
      skipped++
      if (skipped <= 3) console.error('Skip:', (e as Error).message.slice(0, 120))
    }
  }
  await flush()

  console.log(`\n✅ Listo: ${ok} insertadas, ${skipped} omitidas`)
  console.log(`   Con CeCo:      ${withCeco} (${((withCeco/ok)*100).toFixed(1)}%)`)
  console.log(`   Con Cuenta:    ${withAcct} (${((withAcct/ok)*100).toFixed(1)}%)`)
  console.log(`   Con Proveedor: ${withProv} (${((withProv/ok)*100).toFixed(1)}%)`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
