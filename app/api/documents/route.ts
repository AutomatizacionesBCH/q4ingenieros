import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export interface DocItem {
  id:          string
  filename:    string
  folder:      'boletas' | 'facturas'
  tipo:        'Factura' | 'Boleta de Honorarios' | 'Nota de Crédito'
  numero:      number | null
  descripcion: string
  referencia:  string
  fecha:       string | null   // YYYY-MM-DD extracted from filename, or null
  url:         string          // static public URL
}

// ── Date extractor ────────────────────────────────────────────────────────────
const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
}

function extractDate(base: string): string | null {
  // DD.MM.YYYY  or  DD-MM-YYYY
  const dmy = base.match(/(\d{1,2})[.\-](\d{2})[.\-](\d{4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Nombre de mes + año opcional: "Febrero 2026", "Marzo SMAPA"
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

// ── Parser ────────────────────────────────────────────────────────────────────
function parseDoc(filename: string, folder: 'boletas' | 'facturas'): DocItem {
  const base = filename.replace(/\.pdf$/i, '').trim()

  // Tipo
  let tipo: DocItem['tipo']
  if (folder === 'facturas') {
    tipo = /^NC\b/i.test(base) ? 'Nota de Crédito' : 'Factura'
  } else {
    tipo = 'Boleta de Honorarios'
  }

  // Número
  const numMatch =
    base.match(/N[°o](\d+)/i) ||
    base.match(/^BH\s+(\d+)/i) ||
    base.match(/Fact\s+(\d+)/i)
  const numero = numMatch ? Number(numMatch[1]) : null

  // Descripción: strip prefix + number
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
    fecha: extractDate(base),
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
    // public/ is always at process.cwd()/public in both dev and standalone
    const docsRoot = path.join(process.cwd(), 'public', 'docs')

    const boletas  = readFolder(docsRoot, 'boletas')
    const facturas = readFolder(docsRoot, 'facturas')

    const all = [
      ...facturas.sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0)),
      ...boletas.sort((a, b)  => (b.numero ?? 0) - (a.numero ?? 0)),
    ]

    return NextResponse.json({ docs: all, docsRoot, cwd: process.cwd() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
