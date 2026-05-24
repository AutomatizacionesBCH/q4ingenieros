import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { setDocOverride } from '@/lib/db'

// pdf-parse is CJS — require() avoids the ESM default-export type error
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export const dynamic = 'force-dynamic'

// ── Spanish month → MM ───────────────────────────────────────────────────────
const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
}

/**
 * Try to extract the emission date from a PDF's text content.
 * Looks for patterns common in Chilean electronic invoices (DTE):
 *   "Fecha Emision: 20 de Mayo del 2026"
 *   "Fecha: 20/05/2026"
 *   "20 de Mayo del 2026"
 */
function extractDateFromText(text: string): string | null {
  const t = text.replace(/\n/g, ' ')

  // Pattern 1: "Fecha Emisi[oó]n: DD de MES del YYYY"
  const p1 = t.match(/Fecha\s+Emisi[oó]n[:\s]+(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})/i)
  if (p1) {
    const m = MESES[p1[2].toLowerCase()]
    if (m) return `${p1[3]}-${m}-${p1[1].padStart(2, '0')}`
  }

  // Pattern 2: "Fecha: DD/MM/YYYY" or "Fecha Emision: DD/MM/YYYY"
  const p2 = t.match(/Fecha[^:]*:\s*(\d{1,2})[\/\-](\d{2})[\/\-](\d{4})/i)
  if (p2) return `${p2[3]}-${p2[2]}-${p2[1].padStart(2, '0')}`

  // Pattern 3: bare "DD de MES del YYYY" (boletas)
  const p3 = t.match(/(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})/i)
  if (p3) {
    const m = MESES[p3[2].toLowerCase()]
    if (m) return `${p3[3]}-${m}-${p3[1].padStart(2, '0')}`
  }

  // Pattern 4: bare DD/MM/YYYY
  const p4 = t.match(/(\d{2})[\/\-](\d{2})[\/\-](20\d{2})/)
  if (p4) return `${p4[3]}-${p4[2]}-${p4[1]}`

  return null
}

async function processPDF(filePath: string, docId: string): Promise<{ docId: string; fecha: string | null; error?: string }> {
  try {
    const buf  = fs.readFileSync(filePath)
    const data = await pdfParse(buf)
    const fecha = extractDateFromText(data.text)
    if (fecha) setDocOverride(docId, { fecha })
    return { docId, fecha }
  } catch (e) {
    return { docId, fecha: null, error: String(e) }
  }
}

/**
 * POST /api/admin/extract-pdf-dates
 * Reads every PDF in public/docs/, extracts the emission date from its text,
 * and stores it in document_overrides.fecha (only if not already overridden).
 */
export async function POST() {
  try {
    const docsRoot = path.join(process.cwd(), 'public', 'docs')
    const results: Awaited<ReturnType<typeof processPDF>>[] = []

    for (const folder of ['facturas', 'boletas'] as const) {
      const dir = path.join(docsRoot, folder)
      if (!fs.existsSync(dir)) continue
      const files = fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f))
      for (const file of files) {
        const docId   = `${folder}/${file}`
        const filePath = path.join(dir, file)
        results.push(await processPDF(filePath, docId))
      }
    }

    const found   = results.filter(r => r.fecha !== null).length
    const missing = results.filter(r => r.fecha === null).length
    const errors  = results.filter(r => r.error).length

    return NextResponse.json({ ok: true, total: results.length, found, missing, errors, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
