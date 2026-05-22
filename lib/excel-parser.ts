/**
 * lib/excel-parser.ts
 *
 * Server-only. Never import from Client Components.
 *
 * Architecture: module-level cache — the workbook is read once on the first
 * request and held in memory for the lifetime of the Node process. In dev,
 * Hot Module Replacement resets the cache on each file save (expected).
 * In production, the cache lives for the lifetime of the server process.
 *
 * See CLAUDE.md §8 for the rationale.
 */

import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'
import type {
  ProjectSummary,
  ProjectDetail,
  ProjectsIndex,
  ProjectStats,
  EP,
  Expense,
  ProjectBudget,
} from '@/types/project'

// ─── Module-level cache ────────────────────────────────────────────────────────

let wb: XLSX.WorkBook | null = null
let indexCache: ProjectsIndex | null = null
const detailCache = new Map<number, ProjectDetail>()

function getWorkbook(): XLSX.WorkBook {
  if (wb) return wb

  const filePath =
    process.env.EXCEL_PATH ??
    path.join(process.cwd(), '..', 'Q4 INGENIEROS ACTUALIZADA.xlsx')

  // Use readFileSync + XLSX.read() instead of XLSX.readFile() to avoid
  // path-with-spaces issues on Windows.
  const buffer = fs.readFileSync(filePath)

  wb = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,   // parse dates as JS Date objects
    cellNF: false,     // skip number-format strings
    cellStyles: false, // skip styles — significant perf gain on 243-sheet file
    sheetStubs: false,
  })

  return wb
}

// ─── Primitive helpers ────────────────────────────────────────────────────────

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

function toDate(v: unknown): string | null {
  if (!v) return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    return v.toISOString().split('T')[0]
  }
  const s = String(v).trim()
  if (!s || s === '0') return null
  // Excel serial number stored as number
  if (/^\d{5}$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s))
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toISOString().split('T')[0]
}

/** Returns first numeric value in row starting at colStart (skips nulls/zeros). */
function firstNum(row: unknown[], colStart: number): number | null {
  for (let i = colStart; i < row.length; i++) {
    const n = toNum(row[i])
    if (n !== null) return n
  }
  return null
}

function cellContains(v: unknown, keyword: string): boolean {
  return toStr(v).toLowerCase().includes(keyword.toLowerCase())
}

// ─── Resumen sheet parser ─────────────────────────────────────────────────────

function parseResumen(workbook: XLSX.WorkBook): ProjectSummary[] {
  const ws = workbook.Sheets['Resumen']
  if (!ws) throw new Error('Hoja "Resumen" no encontrada en el archivo Excel.')

  // header:1 → returns array-of-arrays; defval:null → empty cells are null
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
  })

  const summaries: ProjectSummary[] = []

  // Row 0 is the header row; project data starts at row 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row || row.length === 0) continue

    // Column A (index 0): project ID — must be a positive integer
    const rawId = row[0]
    const idNum = typeof rawId === 'number' ? rawId : parseFloat(String(rawId ?? ''))
    if (!Number.isFinite(idNum) || !Number.isInteger(idNum) || idNum <= 0) continue

    const id = idNum

    const statusRaw = toStr(row[5])
    const scopeRaw = toStr(row[7])

    // Scope classification — tolerant matching
    let scope: 'Público' | 'Privado' | null = null
    if (/privado/i.test(scopeRaw)) scope = 'Privado'
    else if (/p[úu]blico/i.test(scopeRaw)) scope = 'Público'

    // Management type — stored as single letter or full word
    const mgmtRaw = toStr(row[6]).toLowerCase().trim()
    let managementType: 'm' | 'i' | 'e' | null = null
    if (mgmtRaw === 'm' || mgmtRaw.startsWith('mem')) managementType = 'm'
    else if (mgmtRaw === 'i' || mgmtRaw.startsWith('ing')) managementType = 'i'
    else if (mgmtRaw === 'e' || mgmtRaw.startsWith('esp') || mgmtRaw.startsWith('ext')) managementType = 'e'

    summaries.push({
      id,
      client: toStr(row[1]),
      name: toStr(row[2]),
      startDate: toDate(row[3]),
      endDate: toDate(row[4]),
      status: statusRaw,
      isFinalized: /finalizado/i.test(statusRaw),
      managementType,
      scope,
      projectType: typeof row[8] === 'number' ? row[8] : toNum(row[8]),
    })
  }

  return summaries
}

// ─── Project sheet parser ─────────────────────────────────────────────────────

function parseProjectSheet(
  ws: XLSX.WorkSheet,
): Omit<ProjectDetail, keyof ProjectSummary> {
  const result: Omit<ProjectDetail, keyof ProjectSummary> = {
    paymentModality: null,
    budget: { gross: null, retention: null, net: null },
    eps: [],
    expenses: [],
    totalCollected: null,
    pending: null,
    utility: null,
    margin: null,
    observations: null,
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
  })

  if (rows.length === 0) return result

  // ── 1. Payment modality (rows 0-5) ──────────────────────────────────────
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const row = rows[i] as unknown[]
    for (let j = 0; j < row.length; j++) {
      if (cellContains(row[j], 'modalidad')) {
        for (let k = j + 1; k < row.length; k++) {
          const val = toStr(row[k])
          if (val) { result.paymentModality = val; break }
        }
        break
      }
    }
    if (result.paymentModality) break
  }

  // ── 2. Budget (scan first 12 rows for "Brutos"/"Líquido") ───────────────
  let budgetHeaderRow = -1
  let grossCol = -1, retCol = -1, netCol = -1

  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const row = rows[i] as unknown[]
    let found = false
    for (let j = 0; j < row.length; j++) {
      const c = toStr(row[j]).toLowerCase()
      if (c.includes('bruto')) { grossCol = j; found = true }
      if (c.includes('retenci')) { retCol = j; found = true }
      if (c.includes('líquido') || c.includes('liquido')) { netCol = j; found = true }
    }
    if (found) { budgetHeaderRow = i; break }
  }

  if (budgetHeaderRow >= 0 && budgetHeaderRow + 1 < rows.length) {
    const vr = rows[budgetHeaderRow + 1] as unknown[]
    const budget: ProjectBudget = {
      gross:     grossCol >= 0 ? toNum(vr[grossCol]) : null,
      retention: retCol >= 0   ? toNum(vr[retCol])   : null,
      net:       netCol >= 0   ? toNum(vr[netCol])    : null,
    }
    // Fallback: if gross not found but net found, search nearby
    if (budget.gross === null && budget.net === null) {
      // try scanning the value row for the largest number
      for (let j = 0; j < vr.length; j++) {
        const n = toNum(vr[j])
        if (n && n > 1000) { budget.gross = n; break }
      }
    }
    result.budget = budget
  }

  // ── 3. Locate INGRESOS and EGRESOS section headers ──────────────────────
  let ingresosRow = -1   // row index with "INGRESOS" header
  let ingresosCol = -1   // column of "INGRESOS"
  let egresosCol = -1    // column of "EGRESOS"

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    for (let j = 0; j < row.length; j++) {
      const c = toStr(row[j]).toUpperCase().trim()
      if (c === 'INGRESOS' || c.startsWith('INGRESO')) {
        ingresosRow = i
        ingresosCol = j
      }
      if (c === 'EGRESOS' || c.startsWith('EGRESO')) {
        egresosCol = j
      }
    }
    if (ingresosRow >= 0 && egresosCol >= 0) break
  }

  if (ingresosRow < 0) return result // can't parse without section markers

  // ── 4. Sub-header row (ingresosRow + 1) — detect column positions ────────
  const subHeaderRowIdx = ingresosRow + 1
  const subHeader = subHeaderRowIdx < rows.length
    ? (rows[subHeaderRowIdx] as unknown[])
    : []

  // INGRESOS columns
  let incMontoCol = ingresosCol + 1
  let incEstDateCol = ingresosCol + 2
  let incRealDateCol = ingresosCol + 3

  // EGRESOS columns — detect new vs old structure
  let expDescCol = egresosCol >= 0 ? egresosCol : ingresosCol + 5
  let expNetCol = expDescCol + 1
  let expWithTaxCol = -1
  let isNewStructure = false

  for (let j = 0; j < subHeader.length; j++) {
    const h = toStr(subHeader[j]).toUpperCase()
    // Ingresos
    if (h.includes('MONTO') && egresosCol < 0 || (egresosCol > 0 && j < egresosCol)) {
      if (h.includes('MONTO')) incMontoCol = j
    }
    if (h.includes('ESTIMAT') && (egresosCol < 0 || j < egresosCol)) incEstDateCol = j
    if (h === 'FECHA REAL' || (h.includes('REAL') && (egresosCol < 0 || j < egresosCol))) incRealDateCol = j

    // Egresos — detect new structure (210+)
    if (j >= (egresosCol > 0 ? egresosCol : expDescCol)) {
      if (h.includes('MONTO NETO') || h === 'NETO') { expNetCol = j; isNewStructure = true }
      if (h.includes('CON IMPUESTO') || h.includes('IMPUESTO')) { expWithTaxCol = j; isNewStructure = true }
    }
  }

  // ── 5. Parse data rows (EPs + Expenses simultaneously) ──────────────────
  const dataStart = ingresosRow + 2

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] as unknown[]

    // ── INGRESOS side ─────────────────────────────────────────────────────
    const incDesc = toStr(row[ingresosCol] ?? row[incMontoCol - 1] ?? row[1])

    if (incDesc) {
      const descLower = incDesc.toLowerCase()

      if (descLower.includes('total') && descLower.includes('fecha')) {
        // "Total a la fecha" — extract collected amount
        result.totalCollected = firstNum(row, incMontoCol)

        // Scan next ~6 rows for Pendiente / Utilidad / Margen / Observaciones
        for (let k = i + 1; k < Math.min(i + 10, rows.length); k++) {
          const nr = rows[k] as unknown[]
          const nd = toStr(nr[ingresosCol] ?? nr[1]).toLowerCase()
          if (nd.includes('pendiente')) {
            result.pending = firstNum(nr, incMontoCol)
          } else if (nd.includes('utilidad')) {
            result.utility = firstNum(nr, incMontoCol)
          } else if (nd.includes('margen') || nd.includes('margin')) {
            const m = firstNum(nr, incMontoCol)
            // Margin can be stored as 0-1 fraction or as percent integer
            if (m !== null) result.margin = m > 1 ? m / 100 : m
          } else if (nd.includes('observaci')) {
            // Observations: take remainder of row or next non-empty cell
            for (let col = 1; col < nr.length; col++) {
              const obs = toStr(nr[col])
              if (obs && !obs.toLowerCase().includes('observaci')) {
                result.observations = obs
                break
              }
            }
          }
        }
        // Don't break — still need to process egresos in same rows above
      } else if (
        !descLower.includes('monto') &&
        !descLower.includes('ingreso') &&
        !descLower.includes('estimat') &&
        !descLower.includes('pendiente') &&
        !descLower.includes('utilidad') &&
        !descLower.includes('margen') &&
        !descLower.includes('observaci')
      ) {
        const amount = toNum(row[incMontoCol])
        const estDate = toDate(row[incEstDateCol])
        const realDate = toDate(row[incRealDateCol])

        if (amount !== null || /ep|n[°o]|estado|bh/i.test(incDesc)) {
          const ep: EP = {
            label: incDesc,
            amount,
            estimatedDate: estDate,
            realDate,
            isPaid: !!realDate,
          }
          result.eps.push(ep)
        }
      }
    }

    // ── EGRESOS side ──────────────────────────────────────────────────────
    if (egresosCol >= 0) {
      const expDesc = toStr(row[expDescCol])
      if (expDesc) {
        const expDescLower = expDesc.toLowerCase()

        // Stop markers for egresos
        if (
          expDescLower.includes('total egreso') ||
          expDescLower.includes('total neto') ||
          expDescLower.includes('margen') ||
          expDescLower.includes('costo-venta') ||
          expDescLower.includes('costo venta')
        ) {
          // New-structure (210+) totals — we can also extract them here
          // but we already get totals from the ingresos side scan above
          continue
        }

        // Skip sub-header labels
        if (
          expDescLower.includes('egreso') ||
          expDescLower.includes('monto') ||
          expDescLower.includes('estimat') ||
          expDescLower.includes('descripci')
        ) continue

        const amountNet = toNum(row[expNetCol])
        const amountWithTax = isNewStructure && expWithTaxCol >= 0
          ? toNum(row[expWithTaxCol])
          : null

        if (amountNet !== null || amountWithTax !== null) {
          const expense: Expense = {
            description: expDesc,
            amountNet,
            amountWithTax,
          }
          result.expenses.push(expense)
        }
      }
    }
  }

  return result
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getProjectsIndex(): ProjectsIndex {
  if (indexCache) return indexCache

  const workbook = getWorkbook()
  const allSummaries = parseResumen(workbook)

  // ALL numeric IDs from Resumen are valid projects — even those without a
  // corresponding sheet (e.g. project 174 exists only in Resumen).
  // The instruction says to process *sheets* that appear in Resumen, but the
  // 230-project control figure counts Resumen entries, not sheet count.
  const projects = allSummaries

  const stats: ProjectStats = {
    total:     projects.length,
    active:    projects.filter(p => !p.isFinalized).length,
    finalized: projects.filter(p => p.isFinalized).length,
    public:    projects.filter(p => p.scope === 'Público').length,
    private:   projects.filter(p => p.scope === 'Privado').length,
    noScope:   projects.filter(p => p.scope === null).length,
  }

  indexCache = { projects, stats }
  return indexCache
}

export function getProjectDetail(id: number): ProjectDetail | null {
  // Return cached detail if available
  if (detailCache.has(id)) return detailCache.get(id)!

  const { projects } = getProjectsIndex()
  const summary = projects.find(p => p.id === id)
  if (!summary) return null

  const workbook = getWorkbook()
  const ws = workbook.Sheets[String(id)]
  if (!ws) return null

  const detail: ProjectDetail = {
    ...summary,
    ...parseProjectSheet(ws),
  }

  detailCache.set(id, detail)
  return detail
}

/** Clears all caches (useful for testing). */
export function clearCache(): void {
  wb = null
  indexCache = null
  detailCache.clear()
}
