/**
 * lib/control-parser.ts
 *
 * Server-only. Parses CONTROL_INGENIERIA_Q4_2026_OPTIMIZADO.xlsx
 * Uses module-level cache — file is read once per process lifetime.
 */

import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectEntry {
  project: string
  amount: number
}

/** Summary table row — no meta, no eficiencia */
export interface MonthSummary {
  mes: string
  facturado: number | null
  ingreso: number | null
}

/** Full monthly detail from CURSADO-INGRESADO sheet */
export interface MonthDetail {
  mes: string
  // Box 1: Facturado
  facturadoItems: ProjectEntry[]
  facturadoTotal: number | null
  // Box 2: Ingreso recibido
  ingresoPrivado: number | null
  ingresoPublico: number | null
  ingresoTotal: number | null
  // Box 3: Resumen
  resumenFacturado: number | null
  resumenIngresoCaja: number | null
}

/** Pending amounts from CURSADO-INGRESADO sheet */
export interface PendienteSummary {
  publicoNoFacturado: number | null
  publicoFacturadoNoCobrado: number | null
  publicoTotal: number | null
  privadoNoFacturado: number | null
  privadoBoletasPorCursar: number | null
  privadoTotal: number | null
}

export interface ControlData {
  lastUpdate: string | null
  pendiente: PendienteSummary
  summary: MonthSummary[]
  totals: { facturado: number | null; ingreso: number | null }
  months: MonthDetail[]
}

// ─── Module-level cache ────────────────────────────────────────────────────────

let controlCache: ControlData | null = null

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const cleaned = String(v).replace(/[^0-9.,-]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

// ─── Workbook loader ──────────────────────────────────────────────────────────

let wb: XLSX.WorkBook | null = null

function getControlWorkbook(): XLSX.WorkBook {
  if (wb) return wb
  const filePath = path.join(
    process.cwd(),
    '..',
    'CONTROL_INGENIERIA_Q4_2026_OPTIMIZADO.xlsx',
  )
  const buffer = fs.readFileSync(filePath)
  wb = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellStyles: false,
    sheetStubs: false,
  })
  return wb
}

// ─── RESUMEN sheet — summary table + totals ───────────────────────────────────

function parseResumen(workbook: XLSX.WorkBook): {
  summary: MonthSummary[]
  totals: { facturado: number | null; ingreso: number | null }
} {
  const ws = workbook.Sheets['RESUMEN']
  if (!ws) return { summary: [], totals: { facturado: null, ingreso: null } }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

  const summary: MonthSummary[] = []
  let totals: { facturado: number | null; ingreso: number | null } = {
    facturado: null,
    ingreso: null,
  }

  const monthNames = ['enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre']

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row || row.length === 0) continue

    const mesRaw = toStr(row[0])
    if (!mesRaw) continue

    if (mesRaw.toUpperCase().includes('TOTAL')) {
      totals = { facturado: toNum(row[2]), ingreso: toNum(row[3]) }
      break
    }

    const isMonth = monthNames.some(m => mesRaw.toLowerCase().includes(m))
    if (!isMonth) continue

    summary.push({
      mes: mesRaw,
      facturado: toNum(row[2]),
      ingreso: toNum(row[3]),
    })
  }

  return { summary, totals }
}

// ─── DASHBOARD sheet — lastUpdate ─────────────────────────────────────────────

function parseLastUpdate(workbook: XLSX.WorkBook): string | null {
  const ws = workbook.Sheets['DASHBOARD']
  if (!ws) return null

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const row = rows[i] as unknown[]
    for (const cell of row) {
      const s = toStr(cell)
      if (s.toLowerCase().includes('actualizaci')) {
        const parts = s.split(':')
        if (parts.length >= 2) return parts.slice(1).join(':').trim()
        return s
      }
    }
  }
  return null
}

// ─── CURSADO-INGRESADO sheet — pendiente + monthly detail ─────────────────────

const MONTH_COLS = [
  { mes: 'Enero',   descCol: 6,  amountCol: 7  },
  { mes: 'Febrero', descCol: 9,  amountCol: 10 },
  { mes: 'Marzo',   descCol: 12, amountCol: 13 },
  { mes: 'Abril',   descCol: 15, amountCol: 16 },
  { mes: 'Mayo',    descCol: 18, amountCol: 19 },
]

function parseCursado(workbook: XLSX.WorkBook): {
  pendiente: PendienteSummary
  months: MonthDetail[]
} {
  const sheetName = workbook.SheetNames.find(
    n => n.toUpperCase().includes('CURSADO'),
  )
  const defaultPendiente: PendienteSummary = {
    publicoNoFacturado: null, publicoFacturadoNoCobrado: null, publicoTotal: null,
    privadoNoFacturado: null, privadoBoletasPorCursar: null, privadoTotal: null,
  }
  if (!sheetName) return { pendiente: defaultPendiente, months: [] }

  const ws = workbook.Sheets[sheetName]
  if (!ws) return { pendiente: defaultPendiente, months: [] }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

  // ── Scan for key row indices ──────────────────────────────────────────────
  let publicoNoFacturadoTotalRow   = -1  // "TOTAL  NO FACTURADO" col0
  let publicoFacturadoNoPagadoRow  = -1  // "TOTAL FACTURADO NO PAGADO" col0
  let privadoBoletasTotalRow       = -1  // "TOTAL BOLETAS CURSADAS" col3
  let facturadoTotalRow            = -1  // col6 = "TOTAL" (row 29)
  let ingresoPrivadoRow            = -1  // col6 = "PRIVADOS RECIBIDOS"
  let ingresoPublicoRow            = -1  // col6 = "PÚBLICO RECIBIDO"
  let ingresoTotalRow              = -1  // col6 = "TOTAL INGRESOS"
  let resumenIngresoCajaRow        = -1  // col6 = "TOTAL INGRESO (CAJA)"
  let resumenFacturadoRow          = -1  // col6 = "TOTAL FACTURADO"

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const c0 = toStr(row[0]).toUpperCase()
    const c3 = toStr(row[3]).toUpperCase()
    const c6 = toStr(row[6]).toUpperCase()

    if (c0.includes('TOTAL') && c0.includes('NO FACTURADO') && !c0.includes('PROYECT') && !c0.includes('PAGADO'))
      publicoNoFacturadoTotalRow = i
    if (c0.includes('TOTAL FACTURADO NO PAGADO'))
      publicoFacturadoNoPagadoRow = i
    if (c3.includes('TOTAL BOLETAS'))
      privadoBoletasTotalRow = i

    if (c6 === 'TOTAL')
      facturadoTotalRow = i
    if (c6.includes('PRIVADOS RECIBIDOS'))
      ingresoPrivadoRow = i
    if (c6.includes('PÚBLICO RECIBIDO') || c6.includes('PUBLICO RECIBIDO'))
      ingresoPublicoRow = i
    if (c6 === 'TOTAL INGRESOS')
      ingresoTotalRow = i
    if (c6.includes('TOTAL INGRESO') && c6.includes('CAJA'))
      resumenIngresoCajaRow = i
    if (c6 === 'TOTAL FACTURADO')
      resumenFacturadoRow = i
  }

  // ── Pendiente summary ─────────────────────────────────────────────────────
  const publicoNoFacturado = publicoNoFacturadoTotalRow >= 0
    ? toNum((rows[publicoNoFacturadoTotalRow] as unknown[])[1]) : null
  const publicoFacturadoNoCobrado = publicoFacturadoNoPagadoRow >= 0
    ? toNum((rows[publicoFacturadoNoPagadoRow] as unknown[])[1]) : null
  const privadoNoFacturado = publicoNoFacturadoTotalRow >= 0
    ? toNum((rows[publicoNoFacturadoTotalRow] as unknown[])[4]) : null
  const privadoBoletasPorCursar = privadoBoletasTotalRow >= 0
    ? toNum((rows[privadoBoletasTotalRow] as unknown[])[4]) : null

  const pendiente: PendienteSummary = {
    publicoNoFacturado,
    publicoFacturadoNoCobrado,
    publicoTotal:
      publicoNoFacturado !== null || publicoFacturadoNoCobrado !== null
        ? (publicoNoFacturado ?? 0) + (publicoFacturadoNoCobrado ?? 0)
        : null,
    privadoNoFacturado,
    privadoBoletasPorCursar,
    privadoTotal:
      privadoNoFacturado !== null || privadoBoletasPorCursar !== null
        ? (privadoNoFacturado ?? 0) + (privadoBoletasPorCursar ?? 0)
        : null,
  }

  // ── Monthly detail ────────────────────────────────────────────────────────
  const months: MonthDetail[] = []

  for (const { mes, descCol, amountCol } of MONTH_COLS) {
    // Facturado items (rows 2 → facturadoTotalRow)
    const facturadoItems: ProjectEntry[] = []
    const endRow = facturadoTotalRow > 0 ? facturadoTotalRow : 30
    for (let i = 2; i < endRow; i++) {
      const row = rows[i] as unknown[]
      const desc = toStr(row[descCol])
      const amount = toNum(row[amountCol])
      if (desc && amount !== null && amount !== 0) {
        facturadoItems.push({ project: desc, amount })
      }
    }

    const facturadoTotal = facturadoTotalRow >= 0
      ? toNum((rows[facturadoTotalRow] as unknown[])[amountCol]) : null
    const ingresoPrivado = ingresoPrivadoRow >= 0
      ? toNum((rows[ingresoPrivadoRow] as unknown[])[amountCol]) : null
    const ingresoPublico = ingresoPublicoRow >= 0
      ? toNum((rows[ingresoPublicoRow] as unknown[])[amountCol]) : null
    const ingresoTotal = ingresoTotalRow >= 0
      ? toNum((rows[ingresoTotalRow] as unknown[])[amountCol]) : null
    const resumenIngresoCaja = resumenIngresoCajaRow >= 0
      ? toNum((rows[resumenIngresoCajaRow] as unknown[])[amountCol]) : null
    const resumenFacturado = resumenFacturadoRow >= 0
      ? toNum((rows[resumenFacturadoRow] as unknown[])[amountCol]) : null

    // Only include months with actual data
    if (facturadoTotal !== null || ingresoTotal !== null) {
      months.push({
        mes,
        facturadoItems,
        facturadoTotal,
        ingresoPrivado,
        ingresoPublico,
        ingresoTotal,
        resumenFacturado,
        resumenIngresoCaja,
      })
    }
  }

  return { pendiente, months }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getControlData(): ControlData {
  if (controlCache) return controlCache

  const workbook = getControlWorkbook()
  const { summary, totals } = parseResumen(workbook)
  const lastUpdate = parseLastUpdate(workbook)
  const { pendiente, months } = parseCursado(workbook)

  controlCache = { lastUpdate, pendiente, summary, totals, months }
  return controlCache
}

export function clearControlCache(): void {
  wb = null
  controlCache = null
}
