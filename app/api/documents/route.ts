import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

// ── Path config ───────────────────────────────────────────────────────────────
const BOLETAS_DIR  = process.env.DOCS_BOLETAS_PATH  ?? path.join(process.cwd(), 'data', 'boletas')
const FACTURAS_DIR = process.env.DOCS_FACTURAS_PATH ?? path.join(process.cwd(), 'data', 'facturas')

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DocItem {
  id:          string           // "boletas/Boleta N°197...pdf"
  filename:    string
  folder:      'boletas' | 'facturas'
  tipo:        'Factura' | 'Boleta de Honorarios' | 'Nota de Crédito'
  numero:      number | null
  descripcion: string
  referencia:  string           // última parte tras la coma (ciudad / persona)
  fecha:       string           // YYYY-MM-DD
  sizeKb:      number
}

// ── Parser ────────────────────────────────────────────────────────────────────
function parseDoc(filename: string, folder: 'boletas' | 'facturas', stat: fs.Stats): DocItem {
  const base = filename.replace(/\.pdf$/i, '').trim()

  // Tipo
  let tipo: DocItem['tipo']
  if (folder === 'facturas') {
    tipo = /^NC\b/i.test(base) ? 'Nota de Crédito' : 'Factura'
  } else {
    tipo = 'Boleta de Honorarios'
  }

  // Número: N°NNN, BH NNN, o primer bloque ≥3 dígitos
  const numMatch =
    base.match(/N[°o](\d+)/i) ||
    base.match(/^BH\s+(\d+)/i) ||
    base.match(/Fact\s+(\d+)/i)
  const numero = numMatch ? Number(numMatch[1]) : null

  // Descripción: quitar prefijo de tipo + número
  let desc = base
  if (/^NC\s+Fact/i.test(desc)) {
    desc = numero ? `NC Factura #${numero}` : 'Nota de Crédito'
  } else {
    desc = desc
      .replace(/^(Boleta\s+de\s+Honorarios|Boleta|BH)\s*/i, '')
      .replace(/N[°o]\d+\s*/i, '')
      .trim()
  }

  // Referencia: último segmento tras coma
  const parts      = desc.split(',')
  const referencia = parts.length > 1 ? parts[parts.length - 1].trim() : '—'
  const descripcion = parts.length > 1 ? parts.slice(0, -1).join(',').trim() : desc.trim()

  return {
    id:          `${folder}/${filename}`,
    filename,
    folder,
    tipo,
    numero,
    descripcion,
    referencia,
    fecha:  stat.mtime.toISOString().slice(0, 10),
    sizeKb: Math.round(stat.size / 1024),
  }
}

function readFolder(dir: string, folder: 'boletas' | 'facturas'): DocItem[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => /\.pdf$/i.test(f))
    .map(f => {
      const stat = fs.statSync(path.join(dir, f))
      return parseDoc(f, folder, stat)
    })
}

// ── GET /api/documents ────────────────────────────────────────────────────────
export async function GET() {
  try {
    const boletas  = readFolder(BOLETAS_DIR,  'boletas')
    const facturas = readFolder(FACTURAS_DIR, 'facturas')

    // Merge and sort: facturas first by número desc, then boletas by número desc
    const all = [
      ...facturas.sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0)),
      ...boletas.sort((a, b)  => (b.numero ?? 0) - (a.numero ?? 0)),
    ]

    return NextResponse.json(all)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
