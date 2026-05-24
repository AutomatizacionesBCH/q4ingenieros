import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import zlib from 'zlib'
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
  const dmy = base.match(/(\d{1,2})[.\-](\d{2})[.\-](\d{4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
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

// ── Search for a date pattern in plain text ───────────────────────────────────
function findDateInText(text: string): string | null {
  // "Fecha Emision: 20 de Mayo del 2026" (with or without accent on o)
  const p1 = text.match(/Fecha\s*Emisi[oó]n[:\s]+(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})/i)
  if (p1) {
    const m = MESES[p1[2].toLowerCase()]
    if (m) return `${p1[3]}-${m}-${p1[1].padStart(2, '0')}`
  }

  // "Fecha: DD/MM/YYYY" or "Fecha Emision DD/MM/YYYY"
  const p2 = text.match(/Fecha[^:]*:\s*(\d{1,2})[\/\-](\d{2})[\/\-](\d{4})/i)
  if (p2) return `${p2[3]}-${p2[2]}-${p2[1].padStart(2, '0')}`

  // bare "DD de MES del YYYY" (boletas style)
  const p3 = text.match(/\b(\d{1,2})\s+de\s+([A-Za-záéíóúÁÉÍÓÚ]+)\s+del?\s+(20\d{2})\b/i)
  if (p3) {
    const m = MESES[p3[2].toLowerCase()]
    if (m) return `${p3[3]}-${m}-${p3[1].padStart(2, '0')}`
  }

  return null
}

// ── Date from PDF — decompresses FlateDecode streams (zlib, built-in Node) ────
// Modern PDFs store text in zlib-compressed streams. We decompress each one and
// search for the emission date. No external library needed.
function extractDateFromPDF(filePath: string): string | null {
  try {
    const buf = fs.readFileSync(filePath)

    // Pass 1: raw bytes (some PDFs have uncompressed text, or /CreationDate in header)
    const rawLatin1 = buf.toString('latin1')

    const d0 = findDateInText(rawLatin1)
    if (d0) return d0

    // /CreationDate (D:YYYYMMDD in PDF metadata header
    const cdMatch = rawLatin1.match(/\/CreationDate\s*\(D:(\d{4})(\d{2})(\d{2})/)
    if (cdMatch) return `${cdMatch[1]}-${cdMatch[2]}-${cdMatch[3]}`

    // Pass 2: decompress every FlateDecode stream and search inside
    const STREAM  = Buffer.from('stream')
    const ENDSTRM = Buffer.from('endstream')
    let pos = 0

    while (pos < buf.length) {
      // Find next 'stream' keyword
      const sIdx = buf.indexOf(STREAM, pos)
      if (sIdx === -1) break

      // Must be followed immediately by \n or \r\n (PDF spec)
      const afterStream = sIdx + STREAM.length
      let dataStart: number
      if (buf[afterStream] === 0x0A) {
        dataStart = afterStream + 1
      } else if (buf[afterStream] === 0x0D && buf[afterStream + 1] === 0x0A) {
        dataStart = afterStream + 2
      } else {
        pos = sIdx + 1
        continue
      }

      // Find matching 'endstream'
      const eIdx = buf.indexOf(ENDSTRM, dataStart)
      if (eIdx === -1) break

      // Strip trailing \r\n before endstream
      let dataEnd = eIdx
      if (dataEnd > 0 && buf[dataEnd - 1] === 0x0A) dataEnd--
      if (dataEnd > 0 && buf[dataEnd - 1] === 0x0D) dataEnd--

      if (dataEnd > dataStart + 8) {
        const chunk = buf.slice(dataStart, dataEnd)
        // Try zlib inflate (FlateDecode with zlib header — the standard)
        try {
          const inflated = zlib.inflateSync(chunk)
          const text = inflated.toString('utf8')
          const d = findDateInText(text)
          if (d) return d
        } catch { /* not a valid zlib stream — skip */ }

        // Try raw deflate (FlateDecode without zlib header — less common)
        try {
          const inflated = zlib.inflateRawSync(chunk)
          const text = inflated.toString('utf8')
          const d = findDateInText(text)
          if (d) return d
        } catch { /* skip */ }
      }

      pos = eIdx + ENDSTRM.length
    }

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
  const docsRoot = path.join(process.cwd(), 'public', 'docs')

  // ── 1. List files (never blocked by SQLite) ───────────────────────────────────
  const boletas  = readFolder(docsRoot, 'boletas')
  const facturas = readFolder(docsRoot, 'facturas')

  const all = [
    ...facturas.sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0)),
    ...boletas.sort((a, b)  => (b.numero ?? 0) - (a.numero ?? 0)),
  ]

  // ── 2. SQLite overrides + auto-extract dates (isolated) ───────────────────────
  let overrides: Record<string, { fecha?: string }> = {}
  try {
    overrides = getAllDocOverrides()

    for (const doc of all) {
      if (overrides[doc.id]?.fecha) continue  // already saved in SQLite
      if (doc.fecha) continue                  // filename had a date — good enough

      // Decompress PDF streams and look for the emission date
      const filePath  = path.join(docsRoot, doc.folder, doc.filename)
      const extracted = extractDateFromPDF(filePath)
      if (extracted) {
        setDocOverride(doc.id, { fecha: extracted })
        overrides[doc.id] = { ...overrides[doc.id], fecha: extracted }
      }
    }
  } catch {
    // SQLite unavailable — still return docs with filename-derived dates
  }

  // ── 3. Merge best available fecha ─────────────────────────────────────────────
  const merged = all.map(doc => ({
    ...doc,
    fecha: overrides[doc.id]?.fecha ?? doc.fecha,
  }))

  return NextResponse.json({ docs: merged, docsRoot, cwd: process.cwd() })
}
