import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getAllDocOverrides, setDocOverride } from '@/lib/db'

export const dynamic = 'force-dynamic'

export interface DocItem {
  id:          string
  filename:    string
  folder:      'boletas' | 'facturas'
  tipo:        'Factura' | 'Boleta de Honorarios' | 'Nota de Crédito'
  numero:      number | null
  descripcion: string
  referencia:  string
  fecha:       string | null   // YYYY-MM-DD — best available: override > PDF > filename
  url:         string          // static public URL
}

// ── Spanish month → MM ────────────────────────────────────────────────────────
const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
}

// ── Date from filename ────────────────────────────────────────────────────────
function extractDateFromFilename(base: string): string | null {
  // DD.MM.YYYY  or  DD-MM-YYYY
  const dmy = base.match(/(\d{1,2})[.\-](\d{2})[.\-](\d{4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Spanish month name: "Febrero 2026", "Marzo SMAPA"
  const lower = base.toLowerCase()
  for (const [mes, num] of Object.entries(MESES)) {
    if (lower.includes(mes)) {
      const yearMatch = base.match(/\b(202\d)\b/)
      const year = yearMatch ? yearMatch[1] : '2026'
      return `${year}-${num}-01`
    }
  }
  return null
}

// ── Date from raw PDF bytes (no library) ──────────────────────────────────────
// Chilean DTE PDFs embed plain ASCII text in their content streams, so a simple
// Buffer.toString('binary') + regex is enough — no PDF parser needed.
function extractDateFromPDFBytes(filePath: string): string | null {
  try {
    const buf  = fs.readFileSync(filePath)
    const text = buf.toString('binary') // latin-1 view of raw bytes

    // "Fecha Emision: 20 de Mayo del 2026" — ó may appear as \xf3 in latin-1
    const p1 = text.match(
      /Fecha\s*Emisi[o\xf3]n[:\s]+(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})/i
    )
    if (p1) {
      const m = MESES[p1[2].toLowerCase()]
      if (m) return `${p1[3]}-${m}-${p1[1].padStart(2, '0')}`
    }

    // "Fecha: DD/MM/YYYY" or "Fecha Emision: DD/MM/YYYY"
    const p2 = text.match(/Fecha[^:]*:\s*(\d{1,2})[\/\-](\d{2})[\/\-](\d{4})/i)
    if (p2) return `${p2[3]}-${p2[2]}-${p2[1].padStart(2, '0')}`

    // bare "DD de MES del YYYY"
    const p3 = text.match(/(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})/i)
    if (p3) {
      const m = MESES[p3[2].toLowerCase()]
      if (m) return `${p3[3]}-${m}-${p3[1].padStart(2, '0')}`
    }

    // PDF metadata: /CreationDate (D:YYYYMMDD
    const p4 = text.match(/\/CreationDate\s*\(D:(\d{4})(\d{2})(\d{2})/)
    if (p4) return `${p4[1]}-${p4[2]}-${p4[3]}`

    return null
  } catch {
    return null
  }
}

// ── Parser ────────────────────────────────────────────────────────────────────
function parseDoc(filename: string, folder: 'boletas' | 'facturas'): DocItem {
  const base = filename.replace(/\.pdf$/i, '').trim()

  let tipo: DocItem['tipo']
  if (folder === 'facturas') {
    tipo = /^NC\b/i.test(base) ? 'Nota de Crédito' : 'Factura'
  } else {
    tipo = 'Boleta de Honorarios'
  }

  const numMatch =
    base.match(/N[°o](\d+)/i) ||
    base.match(/^BH\s+(\d+)/i) ||
    base.match(/Fact\s+(\d+)/i)
  const numero = numMatch ? Number(numMatch[1]) : null

  let desc = base
  if (/^NC\s+Fact/i.test(desc)) {
    desc = numero ? `NC Factura #${numero}` : 'Nota de Crédito'
  } else {
    desc = desc
      .replace(/^(Boleta\s+de\s+Honorarios|Boleta|BH)\s*/i, '')
      .replace(/N[°o]\d+\s*/i, '')
      .trim()
  }

  const parts       = desc.split(',')
  const referencia  = parts.length > 1 ? parts[parts.length - 1].trim() : '—'
  const descripcion = parts.length > 1 ? parts.slice(0, -1).join(',').trim() : desc.trim()

  return {
    id:    `${folder}/${filename}`,
    filename,
    folder,
    tipo,
    numero,
    descripcion,
    referencia,
    fecha: extractDateFromFilename(base),
    url:   `/docs/${folder}/${encodeURIComponent(filename)}`,
  }
}

function readFolder(docsRoot: string, folder: 'boletas' | 'facturas'): DocItem[] {
  const dir = path.join(docsRoot, folder)
  if (!fs.existsSync(dir)) return []
  try {
    return fs.readdirSync(dir)
      .filter(f => /\.pdf$/i.test(f))
      .map(f => parseDoc(f, folder))
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const docsRoot = path.join(process.cwd(), 'public', 'docs')

    const boletas  = readFolder(docsRoot, 'boletas')
    const facturas = readFolder(docsRoot, 'facturas')

    const all = [
      ...facturas.sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0)),
      ...boletas.sort((a, b)  => (b.numero ?? 0) - (a.numero ?? 0)),
    ]

    // Load SQLite overrides (includes both auto-extracted and user-set dates)
    const overrides = getAllDocOverrides()

    // Auto-extract PDF dates for docs that have no date anywhere yet
    for (const doc of all) {
      if (overrides[doc.id]?.fecha) continue  // already in SQLite
      if (doc.fecha) continue                  // derived from filename — good enough

      const filePath  = path.join(docsRoot, doc.folder, doc.filename)
      const extracted = extractDateFromPDFBytes(filePath)
      if (extracted) {
        setDocOverride(doc.id, { fecha: extracted })
        // Patch the local overrides object so the merge below sees it immediately
        overrides[doc.id] = { ...overrides[doc.id], fecha: extracted }
      }
    }

    // Merge: override.fecha > pdf-extracted (now in override) > filename-derived
    const merged = all.map(doc => ({
      ...doc,
      fecha: overrides[doc.id]?.fecha ?? doc.fecha,
    }))

    return NextResponse.json({ docs: merged, docsRoot, cwd: process.cwd() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
