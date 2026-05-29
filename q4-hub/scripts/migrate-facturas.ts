/**
 * Migra "Factura Emitidas" → IssuedInvoice
 * Ignora hojas con nombre HojaN (auxiliares de cálculos)
 */
import * as XLSX from 'xlsx'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'

const FILE = 'c:/Users/alcha/OneDrive/Desktop/Proyectos IA/Proyecto Q4 Completo/1. Flujo 2024 - 2026 (18-05-2026).xlsx'

const parseDate = (v: unknown): Date | null => {
  if (!v) return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    const y = v.getFullYear()
    if (y > 2100) {
      const d = new Date(Math.round((y - 25569) * 86400 * 1000))
      return isNaN(d.getTime()) ? null : d
    }
    return y < 1900 ? null : v
  }
  if (typeof v === 'number') {
    if (v < 1) return null
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

const num = (v: unknown): number | null => {
  if (v == null || v === '' || v === '-') return null
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

const str = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s && s !== '-' ? s : null
}

async function main() {
  console.log('📥 Migrando Facturas Emitidas + Factoring\n')

  const wb = XLSX.readFile(FILE, { cellDates: true })

  // ── Empresas ──
  const companies = await prisma.company.findMany({ select: { id: true, name: true } })
  const empMap = new Map(companies.map(c => [c.name, c.id]))
  const q4Id = empMap.get('Q4 Ingenieros')!
  const nobarsoId = empMap.get('Nobarso SpA')!

  // ── CeCos por projectNumber para vincular ──
  const cecos = await prisma.costCenter.findMany({
    select: { id: true, projectNumber: true, companyId: true },
  })
  const cecoByProject = new Map<string, { id: number; companyId: number }>()
  for (const c of cecos) {
    if (c.projectNumber) cecoByProject.set(String(c.projectNumber).trim(), { id: c.id, companyId: c.companyId })
  }

  // ─── 1) Factura Emitidas ────────────────────────────────────────────
  console.log('1. Leyendo "Factura Emitidas" (3 secciones)…')
  const sh = wb.Sheets['Factura Emitidas']
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: null })

  // Detectar inicio de cada sección por header (fila 0 tiene títulos)
  const titleRow = rows[0]
  const sections: { name: string; startCol: number; empresaId: number }[] = []
  if (titleRow) {
    titleRow.forEach((cell, i) => {
      const s = String(cell ?? '').toUpperCase().trim()
      if (s.includes('Q4 INGENIEROS')) sections.push({ name: 'Q4 Ingenieros', startCol: i, empresaId: q4Id })
      else if (s.includes('NOBARZO')) sections.push({ name: 'Nobarso', startCol: i, empresaId: nobarsoId })
    })
  }
  console.log(`   Secciones detectadas: ${sections.map(s => `${s.name}@col${s.startCol}`).join(', ')}`)

  // Header de columnas (fila 1)
  const headerRow = rows[1]
  if (!headerRow) { console.log('   No hay fila de headers'); return }

  // Procesar cada sección
  const allInvoices: Prisma.IssuedInvoiceCreateManyInput[] = []

  for (const sec of sections) {
    // Buscar columnas dentro de la sección
    const nextSecStart = sections.find(s => s.startCol > sec.startCol)?.startCol ?? headerRow.length
    const cols: Record<string, number> = {}
    for (let c = sec.startCol; c < nextSecStart; c++) {
      const h = String(headerRow[c] ?? '').toUpperCase().trim()
      if (h.startsWith('PROYECTO')) cols.proyecto = c
      else if (h === 'EP') { if (cols.ep == null) cols.ep = c; else cols.epEstado = c }
      else if (h.includes('N° FACTURA') || h.includes('FACTURA')) cols.factura = cols.factura ?? c
      else if (h === 'MONTO') cols.monto = c
      else if (h === 'RECIBIDO') cols.recibido = c
      else if (h.includes('FECHA PAGO')) cols.fechaPago = c
      else if (h.includes('FECHA EMISION') || h.includes('EMISIÓN')) cols.fechaEmision = c
      else if (h === 'FACTORIZADO' || h === 'FACTORING') cols.factoring = c
      else if (h.includes('INT FACTORING') || h.includes('INTERES')) cols.factoringInt = c
      else if (h.includes('FECHA VENC')) cols.factoringDue = c
      else if (h === 'ENTIDAD') cols.entidad = c
    }

    let secCount = 0
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r]
      if (!row) continue
      const proj = str(row[cols.proyecto])
      const monto = num(row[cols.monto])
      if (!proj || monto == null) continue

      // Vincular a CeCo por projectNumber
      const ceco = cecoByProject.get(proj)
      const epEstado = String(row[cols.epEstado] ?? '').toLowerCase()
      const status: 'PAGADO' | 'PENDIENTE' | 'NULO' =
        epEstado.includes('pagado') ? 'PAGADO'
        : epEstado.includes('nulo') ? 'NULO' : 'PENDIENTE'

      const factoringRaw = String(row[cols.factoring] ?? '').toLowerCase()
      const factoring = factoringRaw === 'si' || factoringRaw === 'sí'
      const factoringInt = num(row[cols.factoringInt])
      const factoringInterest = factoringInt != null && monto > 0 ? factoringInt / monto : null

      allInvoices.push({
        companyId: ceco?.companyId ?? sec.empresaId,
        costCenterId: ceco?.id ?? null,
        epNumber: str(row[cols.ep]),
        invoiceNumber: str(row[cols.factura]),
        amount: new Prisma.Decimal(monto),
        received: new Prisma.Decimal(num(row[cols.recibido]) ?? 0),
        issueDate: parseDate(row[cols.fechaEmision]),
        paymentDate: parseDate(row[cols.fechaPago]),
        status,
        factoring,
        factoringInterest: factoringInterest != null ? new Prisma.Decimal(factoringInterest) : null,
        factoringDueDate: parseDate(row[cols.factoringDue]),
        entity: str(row[cols.entidad]),
      })
      secCount++
    }
    console.log(`   Sección ${sec.name}: ${secCount} facturas`)
  }

  // ─── 2) Borrar facturas previas e insertar ─────────────────────────
  console.log('\n2. Limpiando facturas previas e insertando…')
  await prisma.issuedInvoice.deleteMany()
  await prisma.issuedInvoice.createMany({ data: allInvoices, skipDuplicates: true })

  const inserted = await prisma.issuedInvoice.count()
  const conCeco = await prisma.issuedInvoice.count({ where: { costCenterId: { not: null } } })
  const factoring = await prisma.issuedInvoice.count({ where: { factoring: true } })
  const pagado = await prisma.issuedInvoice.aggregate({
    where: { status: 'PAGADO' }, _sum: { amount: true, received: true },
  })
  const pendiente = await prisma.issuedInvoice.aggregate({
    where: { status: 'PENDIENTE' }, _sum: { amount: true, received: true },
  })

  console.log(`\n✅ Total facturas: ${inserted}`)
  console.log(`   Vinculadas a CeCo: ${conCeco} (${((conCeco/inserted)*100).toFixed(1)}%)`)
  console.log(`   Con factoring: ${factoring}`)
  console.log(`   Pagadas: $${Math.round(Number(pagado._sum.amount ?? 0)).toLocaleString('es-CL')} facturado, $${Math.round(Number(pagado._sum.received ?? 0)).toLocaleString('es-CL')} recibido`)
  console.log(`   Pendientes: $${Math.round(Number(pendiente._sum.amount ?? 0)).toLocaleString('es-CL')} facturado, $${Math.round(Number(pendiente._sum.received ?? 0)).toLocaleString('es-CL')} recibido`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
