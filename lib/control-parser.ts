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

export interface MonthSummary {
  mes: string
  meta: number | null
  facturado: number | null
  ingreso: number | null
  eficiencia: number | null
}

export interface CursadoItem {
  description: string
  amount: number
}

export interface CursadoSection {
  label: string
  items: CursadoItem[]
  total: number
}

export interface ControlData {
  lastUpdate: string | null
  summary: MonthSummary[]
  totals: { facturado: number | null; ingreso: number | null }
  cursado: CursadoSection[]
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

// ─── RESUMEN sheet parser ─────────────────────────────────────────────────────

function parseResumen(workbook: XLSX.WorkBook): {
  summary: MonthSummary[]
  totals: { facturado: number | null; ingreso: number | null }
} {
  const ws = workbook.Sheets['RESUMEN']
  if (!ws) {
    return { summary: [], totals: { facturado: null, ingreso: null } }
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
  })

  const summary: MonthSummary[] = []
  let totals: { facturado: number | null; ingreso: number | null } = {
    facturado: null,
    ingreso: null,
  }

  // Row 0 (index 0) = header: MES | META | FACTURADO REAL | INGRESO CAJA | EFICIENCIA
  // Rows 1-6 = Enero–Junio
  // Row 7 = TOTAL Q4
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row || row.length === 0) continue

    const mesRaw = toStr(row[0])
    if (!mesRaw) continue

    // Row 7 is "TOTAL Q4" row
    if (mesRaw.toUpperCase().includes('TOTAL')) {
      totals = {
        facturado: toNum(row[2]),
        ingreso: toNum(row[3]),
      }
      break
    }

    // Skip rows that don't look like month data
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    const isMonth = monthNames.some(m => mesRaw.toLowerCase().includes(m))
    if (!isMonth) continue

    const meta = toNum(row[1])
    const facturado = toNum(row[2])
    const ingreso = toNum(row[3])
    const eficienciaRaw = toNum(row[4])
    // Eficiencia may be stored as 0-1 fraction or percent
    const eficiencia =
      eficienciaRaw !== null && eficienciaRaw > 0 && eficienciaRaw <= 1
        ? eficienciaRaw * 100
        : eficienciaRaw

    summary.push({
      mes: mesRaw,
      meta,
      facturado,
      ingreso,
      eficiencia,
    })
  }

  return { summary, totals }
}

// ─── DASHBOARD sheet — lastUpdate ─────────────────────────────────────────────

function parseLastUpdate(workbook: XLSX.WorkBook): string | null {
  const ws = workbook.Sheets['DASHBOARD']
  if (!ws) return null

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
  })

  // Row 0 (index 0): "Última actualización: Abril 2026" or similar
  for (let i = 0; i < Math.min(4, rows.length); i++) {
    const row = rows[i] as unknown[]
    for (const cell of row) {
      const s = toStr(cell)
      if (s.toLowerCase().includes('actualizaci')) {
        // Extract everything after the colon
        const parts = s.split(':')
        if (parts.length >= 2) return parts.slice(1).join(':').trim()
        return s
      }
    }
  }
  return null
}

// ─── CURSADO-INGRESADO sheet parser ───────────────────────────────────────────

interface ColPair {
  label: string
  descCol: number
  amountCol: number
}

function parseCursado(workbook: XLSX.WorkBook): CursadoSection[] {
  const sheetName = workbook.SheetNames.find(
    n => n.toUpperCase().includes('CURSADO') || n.toUpperCase().includes('INGRESADO'),
  )
  if (!sheetName) return []

  const ws = workbook.Sheets[sheetName]
  if (!ws) return []

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
  })

  if (rows.length === 0) return []

  // Column pair definitions per spec
  const colPairs: ColPair[] = [
    { label: 'Públicos Pendientes', descCol: 0,  amountCol: 1  },
    { label: 'Privados Pendientes', descCol: 3,  amountCol: 4  },
    { label: 'Enero',               descCol: 6,  amountCol: 7  },
    { label: 'Febrero',             descCol: 9,  amountCol: 10 },
    { label: 'Marzo',               descCol: 12, amountCol: 13 },
    { label: 'Abril',               descCol: 15, amountCol: 16 },
    { label: 'Mayo',                descCol: 18, amountCol: 19 },
  ]

  const sections: CursadoSection[] = []

  for (const { label, descCol, amountCol } of colPairs) {
    const items: CursadoItem[] = []

    // Start from row 1 (skip row 0 which has section headers, row 1 sub-headers)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const desc = toStr(row[descCol])
      const amountRaw = toNum(row[amountCol])

      // Skip sub-header rows
      if (
        desc.toUpperCase().includes('PROYECTO') ||
        desc.toUpperCase().includes('MONTO')
      ) continue

      // Stop when both desc and amount are null/empty
      if (!desc && amountRaw === null) continue

      // Skip rows with no description and no amount
      if (!desc && amountRaw === null) break

      // Only include rows that have a non-zero amount
      if (amountRaw !== null && amountRaw !== 0 && desc) {
        items.push({ description: desc, amount: amountRaw })
      }
    }

    if (items.length > 0) {
      const total = items.reduce((acc, it) => acc + it.amount, 0)
      sections.push({ label, items, total })
    }
  }

  return sections
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getControlData(): ControlData {
  if (controlCache) return controlCache

  const workbook = getControlWorkbook()
  const { summary, totals } = parseResumen(workbook)
  const lastUpdate = parseLastUpdate(workbook)
  const cursado = parseCursado(workbook)

  controlCache = { lastUpdate, summary, totals, cursado }
  return controlCache
}

/** Clears cache (useful for testing / hot reload). */
export function clearControlCache(): void {
  wb = null
  controlCache = null
}
