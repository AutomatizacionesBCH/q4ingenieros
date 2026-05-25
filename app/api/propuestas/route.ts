import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import { getPropuestaOverrides, setPropuestaOverride } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ── Types ──────────────────────────────────────────────────────────────────────
export interface PropuestaItem {
  id:          string          // filename sin .pdf
  proyectoId:  number | null   // 212, 215 …
  version:     string          // "01"
  tipo:        string          // "PAV" | "VER" | "ROT" | "CCL" | "IMIV" | "PRY" | "ARQ" | "EST"
  locCode:     string          // "MCHL", "ETBO" …
  contraparte: string          // "Francisca Soto Fuentes"
  proyecto:    string          // "Elaboración Proyecto de ingeniería…"
  especialista:string          // puede coincidir con contraparte
  comuna:      string | null
  codigo:      string          // "P-212"
  fecha:       string | null   // YYYY-MM-DD
  url:         string
}

// ── Type code → label ──────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  PAV:  'Pavimentación',
  VER:  'Veredas',
  ROT:  'Rotura y Reposición',
  CCL:  'Ciclovía',
  IMIV: 'IMIV',
  PRY:  'Proyecto',
  ARQ:  'Arquitectura',
  EST:  'Estructural',
}
export function tipoLabel(code: string) {
  return TIPO_LABEL[code.toUpperCase()] ?? code
}

// ── Date helpers ───────────────────────────────────────────────────────────────
const MESES: Record<string, string> = {
  enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06',
  julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12',
}

function findFirstDate(text: string): string | null {
  let best: { index: number; date: string } | null = null

  const m1 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/)
  if (m1 && m1.index !== undefined) {
    const d = parseInt(m1[1]), mo = parseInt(m1[2])
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      best = { index: m1.index, date: `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}` }
  }
  const m2 = text.match(/\b(\d{1,2})\s+de\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+)\s+de(?:l)?\s+(20\d{2})\b/i)
  if (m2 && m2.index !== undefined) {
    const mes = MESES[m2[2].toLowerCase()]
    if (mes && (best === null || m2.index < best.index))
      best = { index: m2.index, date: `${m2[3]}-${mes}-${m2[1].padStart(2,'0')}` }
  }
  return best?.date ?? null
}

// ── Text extraction ────────────────────────────────────────────────────────────
function extractLine(lines: string[], prefix: string): string {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(prefix)) {
      const val = lines[i].replace(prefix, '').trim()
      if (val) return val
      return lines[i + 1]?.trim() ?? ''
    }
  }
  return ''
}

async function parsePropuesta(filePath: string, filename: string): Promise<PropuestaItem> {
  const m = filename.match(/^(\d+)-(\d+)-PCE_([A-Z]+)-([A-Z]+)\.pdf$/i)
  const proyectoId  = m ? parseInt(m[1]) : null
  const version     = m ? m[2] : '01'
  const tipo        = m ? m[3].toUpperCase() : 'PCE'
  const locCode     = m ? m[4].toUpperCase() : ''
  const codigo      = proyectoId ? `P-${proyectoId}` : filename.replace('.pdf', '')

  try {
    const buf   = fs.readFileSync(filePath)
    const data  = await pdfParse(buf)
    const text  = data.text
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)

    const contraparteMatch = text.match(/Q4 INGENIEROS\s*[–\-]\s*(.+)/i)
    const contraparte = contraparteMatch
      ? contraparteMatch[1].trim().replace(/\s+/g, ' ')
      : ''

    const proyecto    = extractLine(lines, 'Proyecto')
    const comunaRaw   = extractLine(lines, 'Comuna')
    const especialista = extractLine(lines, 'Especialista')
    const fecha       = findFirstDate(text)

    return {
      id:          filename.replace(/\.pdf$/i, ''),
      proyectoId,
      version,
      tipo,
      locCode,
      contraparte,
      proyecto:    proyecto || filename,
      especialista: especialista || contraparte,
      comuna:      comunaRaw || null,
      codigo,
      fecha,
      url:         `/docs/propuestas/${encodeURIComponent(filename)}`,
    }
  } catch {
    return {
      id:          filename.replace(/\.pdf$/i, ''),
      proyectoId,
      version,
      tipo,
      locCode,
      contraparte: '',
      proyecto:    filename,
      especialista: '',
      comuna:      null,
      codigo,
      fecha:       null,
      url:         `/docs/propuestas/${encodeURIComponent(filename)}`,
    }
  }
}

// ── Module-level cache (re-parsed once per server process) ────────────────────
let cache: PropuestaItem[] | null = null

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === '1'

  const dir = path.join(process.cwd(), 'public', 'docs', 'propuestas')

  if (!fs.existsSync(dir)) {
    return NextResponse.json({ propuestas: [] })
  }

  // ── 1. Parse PDFs (cached) ────────────────────────────────────────────────
  if (!cache || refresh) {
    const files = fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f)).sort()
    cache = await Promise.all(
      files.map(f => parsePropuesta(path.join(dir, f), f))
    )
  }

  // ── 2. Supabase overrides ─────────────────────────────────────────────────
  let overrides: Record<string, { fecha?: string; status?: string }> = {}
  try {
    overrides = await getPropuestaOverrides()
  } catch {
    // Supabase unavailable — return with PDF-extracted data only
  }

  // ── 3. Merge ──────────────────────────────────────────────────────────────
  const merged = cache.map(p => ({
    ...p,
    fecha: overrides[p.id]?.fecha ?? p.fecha,
  }))

  return NextResponse.json({ propuestas: merged })
}
