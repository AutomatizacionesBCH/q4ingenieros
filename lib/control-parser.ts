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

export type TipoIngreso = 'Público' | 'Privado'

export type TipoPendiente = 'noFac' | 'facNoCob' | 'boletas'

export interface PendienteItem {
  project: string
  amount: number
  tipo: TipoPendiente
}

export interface PendienteDetail {
  publicoItems: PendienteItem[]
  privadoItems: PendienteItem[]
}

export interface IngresoEntry {
  project: string
  amount: number
  /** Auto-assigned via greedy subset-sum against Excel reference totals */
  tipo: TipoIngreso
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
  ingresoItems: IngresoEntry[]
  /** Excel reference totals (rows 50-51) — used for auto-assign and display */
  ingresoPrivadoRef: number | null
  ingresoPublicoRef: number | null
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
  pendienteDetail: PendienteDetail
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
  const filePath =
    process.env.CONTROL_EXCEL_PATH ??
    path.join(process.cwd(), 'data', 'CONTROL_INGENIERIA_Q4_2026_OPTIMIZADO.xlsx')
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

// ─── Greedy subset-sum tipo assignment ───────────────────────────────────────
// Tries all 2^n subsets (n ≤ ~10) to find which items sum to publicoRef.
// If an exact match is found, marks those as 'Público'. Otherwise all 'Privado'.
function assignTipos(
  items: ProjectEntry[],
  publicoRef: number | null,
): IngresoEntry[] {
  const EPS = 2
  if (!publicoRef || publicoRef < EPS) {
    return items.map(it => ({ ...it, tipo: 'Privado' as const }))
  }

  const n = items.length
  const limit = Math.min(n, 20) // safety cap for bitmask
  for (let mask = 1; mask < (1 << limit); mask++) {
    let sum = 0
    for (let bit = 0; bit < limit; bit++) {
      if (mask & (1 << bit)) sum += items[bit].amount
    }
    if (Math.abs(sum - publicoRef) < EPS) {
      return items.map((it, i) => ({
        ...it,
        tipo: (mask & (1 << i)) ? 'Público' : 'Privado' as TipoIngreso,
      }))
    }
  }
  // No exact subset found → default all to Privado
  return items.map(it => ({ ...it, tipo: 'Privado' as const }))
}

const MONTH_COLS = [
  { mes: 'Enero',   descCol: 6,  amountCol: 7  },
  { mes: 'Febrero', descCol: 9,  amountCol: 10 },
  { mes: 'Marzo',   descCol: 12, amountCol: 13 },
  { mes: 'Abril',   descCol: 15, amountCol: 16 },
  { mes: 'Mayo',    descCol: 18, amountCol: 19 },
]

function parseCursado(workbook: XLSX.WorkBook): {
  pendiente: PendienteSummary
  pendienteDetail: PendienteDetail
  months: MonthDetail[]
} {
  const sheetName = workbook.SheetNames.find(
    n => n.toUpperCase().includes('CURSADO'),
  )
  const defaultPendiente: PendienteSummary = {
    publicoNoFacturado: null, publicoFacturadoNoCobrado: null, publicoTotal: null,
    privadoNoFacturado: null, privadoBoletasPorCursar: null, privadoTotal: null,
  }
  const defaultDetail: PendienteDetail = { publicoItems: [], privadoItems: [] }
  if (!sheetName) return { pendiente: defaultPendiente, pendienteDetail: defaultDetail, months: [] }

  const ws = workbook.Sheets[sheetName]
  if (!ws) return { pendiente: defaultPendiente, pendienteDetail: defaultDetail, months: [] }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

  // ── Scan for key row indices ──────────────────────────────────────────────
  let publicoNoFacturadoTotalRow   = -1  // "TOTAL  NO FACTURADO" col0
  let proximosFacturarTotalRow     = -1  // "TOTAL NO FACTURADO PERO PROYECTABLE" col0
  let publicoFacturadoNoPagadoRow  = -1  // "TOTAL FACTURADO NO PAGADO" col0
  let privadoBoletasTotalRow       = -1  // "TOTAL BOLETAS CURSADAS" col3
  let facturadoTotalRow            = -1  // col6 = "TOTAL" (row 29)
  let ingresoHeaderRow             = -1  // col6 = "INGRESO RECIBIDO ENERO 2026" (row 36)
  let ingresoPrivadoRow            = -1  // col6 = "PRIVADOS RECIBIDOS" (row 50)
  let ingresoPublicoRow            = -1  // col6 = "PÚBLICO RECIBIDO" (row 51)
  let ingresoTotalRow              = -1  // col6 = "TOTAL INGRESOS" (row 54)
  let resumenIngresoCajaRow        = -1  // col6 = "TOTAL INGRESO (CAJA)" (row 58)
  let resumenFacturadoRow          = -1  // col6 = "TOTAL FACTURADO" (row 59)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const c0 = toStr(row[0]).toUpperCase()
    const c3 = toStr(row[3]).toUpperCase()
    const c6 = toStr(row[6]).toUpperCase()

    if (c0.includes('TOTAL') && c0.includes('NO FACTURADO') && !c0.includes('PROYECT') && !c0.includes('PAGADO'))
      publicoNoFacturadoTotalRow = i
    if (c0.includes('PROYECTABLE'))
      proximosFacturarTotalRow = i
    if (c0.includes('TOTAL FACTURADO NO PAGADO'))
      publicoFacturadoNoPagadoRow = i
    if (c3.includes('TOTAL BOLETAS'))
      privadoBoletasTotalRow = i

    if (c6 === 'TOTAL')
      facturadoTotalRow = i
    if (c6.includes('INGRESO RECIBIDO') && !c6.includes('PRIVADOS') && !c6.includes('TOTAL'))
      ingresoHeaderRow = i
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
  const basePublicoNoFacturado = publicoNoFacturadoTotalRow >= 0
    ? toNum((rows[publicoNoFacturadoTotalRow] as unknown[])[1]) : null
  // "Próximos a facturar/No proyectados" — se suma a No Facturado
  const proximosTotal = proximosFacturarTotalRow >= 0
    ? (toNum((rows[proximosFacturarTotalRow] as unknown[])[1]) ??
       toNum((rows[proximosFacturarTotalRow] as unknown[])[2]))
    : null
  const publicoNoFacturado =
    basePublicoNoFacturado !== null || proximosTotal !== null
      ? (basePublicoNoFacturado ?? 0) + (proximosTotal ?? 0)
      : null
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

  // ── Pendiente detail items ────────────────────────────────────────────────
  const publicoItems: PendienteItem[] = []
  const privadoItems: PendienteItem[] = []

  // No Facturado section: rows 2..publicoNoFacturadoTotalRow-1 (cols 0-1 pub, 3-4 priv)
  if (publicoNoFacturadoTotalRow > 2) {
    for (let i = 2; i < publicoNoFacturadoTotalRow; i++) {
      const r = rows[i] as unknown[]
      const pubName = toStr(r[0])
      const pubAmt  = toNum(r[1])
      if (pubName && pubAmt !== null && pubAmt !== 0) {
        publicoItems.push({ project: pubName, amount: pubAmt, tipo: 'noFac' })
      }
      const privName = toStr(r[3])
      const privAmt  = toNum(r[4])
      if (privName && privAmt !== null && privAmt !== 0) {
        privadoItems.push({ project: privName, amount: privAmt, tipo: 'noFac' })
      }
    }
  }

  // "Próximos a facturar/No proyectados" → tipo noFac (sumados a No Facturado)
  if (publicoNoFacturadoTotalRow >= 0 && proximosFacturarTotalRow > publicoNoFacturadoTotalRow) {
    for (let i = publicoNoFacturadoTotalRow + 1; i < proximosFacturarTotalRow; i++) {
      const r = rows[i] as unknown[]
      const pubName = toStr(r[0])
      const pubAmt  = toNum(r[1])
      if (pubName && pubAmt !== null && pubAmt !== 0) {
        publicoItems.push({ project: pubName, amount: pubAmt, tipo: 'noFac' })
      }
      const privName = toStr(r[3])
      const privAmt  = toNum(r[4])
      if (privName && privAmt !== null && privAmt !== 0) {
        privadoItems.push({ project: privName, amount: privAmt, tipo: 'noFac' })
      }
    }
  }

  // Facturado/No Cobrado (pub) and Boletas (priv)
  // Empieza después de "próximos" si existe, si no después de "no facturado"
  const facNoCobStart = proximosFacturarTotalRow >= 0
    ? proximosFacturarTotalRow
    : publicoNoFacturadoTotalRow
  if (facNoCobStart >= 0 && publicoFacturadoNoPagadoRow > facNoCobStart) {
    for (let i = facNoCobStart + 1; i < publicoFacturadoNoPagadoRow; i++) {
      const r = rows[i] as unknown[]
      const pubName = toStr(r[0])
      const pubAmt  = toNum(r[1])
      if (pubName && pubAmt !== null && pubAmt !== 0) {
        publicoItems.push({ project: pubName, amount: pubAmt, tipo: 'facNoCob' })
      }
      const privName = toStr(r[3])
      const privAmt  = toNum(r[4])
      if (privName && privAmt !== null && privAmt !== 0) {
        privadoItems.push({ project: privName, amount: privAmt, tipo: 'boletas' })
      }
    }
  }

  const pendienteDetail: PendienteDetail = { publicoItems, privadoItems }

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

    // Ingreso items (rows ingresoHeaderRow+2 → ingresoPrivadoRow-1)
    const ingresoItems: ProjectEntry[] = []
    if (ingresoHeaderRow >= 0 && ingresoPrivadoRow > ingresoHeaderRow) {
      for (let i = ingresoHeaderRow + 2; i < ingresoPrivadoRow; i++) {
        const r = rows[i] as unknown[]
        const desc = toStr(r[descCol])
        const amount = toNum(r[amountCol])
        if (desc && amount !== null && amount !== 0) {
          ingresoItems.push({ project: desc, amount })
        }
      }
    }

    const ingresoPrivadoRef = ingresoPrivadoRow >= 0
      ? toNum((rows[ingresoPrivadoRow] as unknown[])[amountCol]) : null
    const ingresoPublicoRef = ingresoPublicoRow >= 0
      ? toNum((rows[ingresoPublicoRow] as unknown[])[amountCol]) : null
    const ingresoTotal = ingresoTotalRow >= 0
      ? toNum((rows[ingresoTotalRow] as unknown[])[amountCol]) : null
    const resumenIngresoCaja = resumenIngresoCajaRow >= 0
      ? toNum((rows[resumenIngresoCajaRow] as unknown[])[amountCol]) : null
    const resumenFacturado = resumenFacturadoRow >= 0
      ? toNum((rows[resumenFacturadoRow] as unknown[])[amountCol]) : null

    // Auto-assign tipos using Excel reference totals
    const ingresoItemsTyped = assignTipos(ingresoItems, ingresoPublicoRef)

    // Only include months with actual data
    if (facturadoTotal !== null || ingresoTotal !== null) {
      months.push({
        mes,
        facturadoItems,
        facturadoTotal,
        ingresoItems: ingresoItemsTyped,
        ingresoPrivadoRef,
        ingresoPublicoRef,
        ingresoTotal,
        resumenFacturado,
        resumenIngresoCaja,
      })
    }
  }

  return { pendiente, pendienteDetail, months }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getControlData(): ControlData {
  if (controlCache) return controlCache

  const workbook = getControlWorkbook()
  const { summary, totals } = parseResumen(workbook)
  const lastUpdate = parseLastUpdate(workbook)
  const { pendiente, pendienteDetail, months } = parseCursado(workbook)

  controlCache = { lastUpdate, pendiente, pendienteDetail, summary, totals, months }
  return controlCache
}

export function clearControlCache(): void {
  wb = null
  controlCache = null
}
