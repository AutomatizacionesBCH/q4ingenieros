import * as XLSX from 'xlsx'
import { prisma } from '../lib/prisma'
import type { Prisma } from '@prisma/client'

const FILE = 'c:/Users/alcha/OneDrive/Desktop/Proyectos IA/Proyecto Q4 Completo/1. Flujo 2024 - 2026 (18-05-2026).xlsx'
const BATCH = 500

const parseDate = (v: unknown): Date | null => {
  if (!v) return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    const y = v.getFullYear()
    // Excel serial stored as year (e.g. 45293 = Jan 2024 serial)
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

async function main() {
  const wb = XLSX.readFile(FILE, { cellDates: true })

  // 1. Seed companies
  const companies = await Promise.all([
    prisma.company.upsert({ where: { rut: '76000001-1' }, update: {}, create: { name: 'Novarso SpA', rut: '76000001-1', type: 'PRINCIPAL' } }),
    prisma.company.upsert({ where: { rut: '76000002-2' }, update: {}, create: { name: 'IDQ4 Construcciones', rut: '76000002-2', type: 'PRINCIPAL' } }),
    prisma.company.upsert({ where: { rut: '76000003-3' }, update: {}, create: { name: 'Transversales', rut: '76000003-3', type: 'TRANSVERSAL', splitRatio: 0.5 } }),
  ])
  const companyMap = new Map(companies.map(c => [c.name.toLowerCase().slice(0, 3), c.id]))
  console.log('Empresas: OK')

  // 2. Seed centros de costo
  const sheetCeco = wb.Sheets['Centros de Costos']
  if (sheetCeco) {
    const cecoRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheetCeco)
    for (const row of cecoRows) {
      const code = String(row['Código'] ?? row['Codigo'] ?? '').trim()
      const name = String(row['Centro de Costo'] ?? row['Nombre'] ?? '').trim()
      const empresa = String(row['Empresa'] ?? '').trim().toLowerCase().slice(0, 3)
      const companyId = companyMap.get(empresa) ?? companies[0].id
      if (!code || !name) continue
      await prisma.costCenter.upsert({
        where: { code },
        update: { name, companyId },
        create: { code, name, companyId, projectNumber: String(row['N° Proyecto'] ?? '').trim() || null },
      })
    }
    console.log('Centros de costo: OK')
  }

  // 3. Seed accounts + categories
  const sheetCuentas = wb.Sheets['Cuenta y Categoría']
  if (sheetCuentas) {
    const cuentaRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheetCuentas)
    for (const row of cuentaRows) {
      const code = String(row['Código Cta'] ?? row['Codigo'] ?? '').trim()
      const name = String(row['Cta Contable'] ?? row['Cuenta'] ?? '').trim()
      const catName = String(row['Categorías'] ?? row['Categoria'] ?? '').trim()
      const mvType = String(row['Movimiento'] ?? '').toLowerCase().includes('ingreso') ? 'INGRESO' : 'EGRESO'
      if (!code || !name) continue
      const account = await prisma.account.upsert({
        where: { code },
        update: {},
        create: { code, name, movementType: mvType as 'INGRESO' | 'EGRESO' },
      })
      if (catName) {
        const exists = await prisma.category.findFirst({ where: { name: catName, accountId: account.id } })
        if (!exists) await prisma.category.create({ data: { name: catName, accountId: account.id } })
      }
    }
    console.log('Cuentas y categorías: OK')
  }

  // Pre-load lookups into Maps to avoid N+1 queries
  const [allCecos, allAccounts] = await Promise.all([
    prisma.costCenter.findMany({ select: { id: true, code: true } }),
    prisma.account.findMany({ select: { id: true, code: true } }),
  ])
  const cecoById = new Map(allCecos.map(c => [c.code, c.id]))
  const accountById = new Map(allAccounts.map(a => [a.code, a.id]))

  // 4. Migrate BD transactions (batch insert)
  const sheetBD = wb.Sheets['BD']
  if (!sheetBD) { console.error('Hoja BD no encontrada'); return }
  const bdRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheetBD)
  console.log(`Migrando ${bdRows.length} transacciones en batches de ${BATCH}…`)

  const batch: Prisma.TransactionCreateManyInput[] = []
  let ok = 0, skipped = 0

  const flush = async () => {
    if (batch.length === 0) return
    await prisma.transaction.createMany({ data: batch, skipDuplicates: true })
    ok += batch.length
    batch.length = 0
    console.log(`  ${ok}/${bdRows.length}…`)
  }

  for (const row of bdRows) {
    try {
      const empresa = String(row['Empresa'] ?? '').trim().toLowerCase().slice(0, 3)
      const companyId = companyMap.get(empresa) ?? companies[0].id

      const cecoCode = String(row['Código ceco'] ?? row['Codigo ceco'] ?? '').trim()
      const costCenterId = cecoCode ? (cecoById.get(cecoCode) ?? null) : null

      const ctaCode = String(row['Código cta'] ?? row['Codigo cta'] ?? '').trim()
      const accountId = ctaCode ? (accountById.get(ctaCode) ?? null) : null

      const mvRaw = String(row['Movimiento'] ?? '').toLowerCase()
      const movementType = mvRaw.includes('ingreso') ? 'INGRESO' : 'EGRESO'

      const net = parseFloat(String(row['Neto'] ?? '0').replace(/[^0-9.-]/g, '')) || 0
      const tax = parseFloat(String(row['Impuesto'] ?? '0').replace(/[^0-9.-]/g, '')) || 0
      const gross = parseFloat(String(row['Bruto'] ?? '').replace(/[^0-9.-]/g, '')) || net + tax

      const statusRaw = String(row['Estado'] ?? '').toLowerCase()
      const status = statusRaw.includes('pagado') ? 'PAGADO' : statusRaw.includes('nulo') ? 'NULO' : 'PENDIENTE'

      const bankRaw = String(row['Banco pagador'] ?? '')
      const bank = bankRaw.includes('Chile') ? 'CHILE'
        : bankRaw.includes('BCI') ? 'BCI'
        : bankRaw.includes('Itaú') || bankRaw.includes('Itau') ? 'ITAU'
        : bankRaw.includes('Santander') ? 'SANTANDER' : null

      const pmRaw = String(row['Modalidad de pago'] ?? '')
      const paymentMethod = pmRaw.includes('Transfer') ? 'TRANSFERENCIA'
        : pmRaw.includes('Cheque') ? 'CHEQUE'
        : pmRaw.includes('Tarjeta') || pmRaw.includes('tarjeta') ? 'TARJETA_CREDITO' : null

      batch.push({
        companyId,
        costCenterId,
        accountId,
        movementType: movementType as 'INGRESO' | 'EGRESO',
        description: String(row['Descripción'] ?? row['Descripcion'] ?? '').trim() || '(sin descripción)',
        quantity: parseFloat(String(row['Cantidad'] ?? '').replace(/[^0-9.-]/g, '')) || null,
        unitValue: parseFloat(String(row['Valor x UM'] ?? '').replace(/[^0-9.-]/g, '')) || null,
        net,
        tax,
        gross,
        paymentDate: parseDate(row['Fecha de pago']),
        status: status as 'PAGADO' | 'PENDIENTE' | 'NULO',
        paymentMethod: paymentMethod as 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA_CREDITO' | null,
        bank: bank as 'CHILE' | 'BCI' | 'ITAU' | 'SANTANDER' | null,
        docIssueDate: parseDate(row['Fecha emisión doc']),
        docDueDate: parseDate(row['Fecha venc. fact']),
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
  console.log(`\nListo: ${ok} insertadas, ${skipped} omitidas`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
