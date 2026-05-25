import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import { getAllDocOverrides, setDocOverride } from '@/lib/db'

// Suppress pdf-parse test-file noise in production logs
process.env['PDFJS_DISABLE_WORKER'] = '1'

export const dynamic = 'force-dynamic'

// ── Caché a nivel de módulo (persiste en producción — igual que workbook) ──────
interface DocsCache { docs: DocItem[]; ts: number }
let _cache: DocsCache | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

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

// ── Find the FIRST date that appears in extracted PDF text ───────────────────
function findFirstDateInText(text: string): string | null {
  let best: { index: number; date: string } | null = null

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY
  const m1 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/)
  if (m1 && m1.index !== undefined) {
    const d = parseInt(m1[1]), mo = parseInt(m1[2])
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      best = { index: m1.index, date: `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}` }
  }

  // Pattern 2: DD de MES de/del YYYY
  const m2 = text.match(/\b(\d{1,2})\s+de\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+)\s+de(?:l)?\s+(20\d{2})\b/i)
  if (m2 && m2.index !== undefined) {
    const mes = MESES[m2[2].toLowerCase()]
    if (mes && (best === null || m2.index < best.index))
      best = { index: m2.index, date: `${m2[3]}-${mes}-${m2[1].padStart(2,'0')}` }
  }

  return best?.date ?? null
}

// ── Extract date from PDF using pdf-parse (handles all font encodings) ────────
// pdf-parse properly decodes CMap font tables, which our previous manual
// zlib approach could not — fixing boletas whose text was unreadable.
async function extractDateFromPDF(filePath: string): Promise<string | null> {
  try {
    const buf  = fs.readFileSync(filePath)
    const data = await pdfParse(buf)
    return findFirstDateInText(data.text)
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

// ── Extracción de fechas PDF en background (fire & forget) ───────────────────
// Procesa en lotes paralelos de 5 para no saturar el sistema.
// Actualiza Supabase y el caché en memoria sin bloquear la respuesta.
async function extractDatesBackground(
  missing: DocItem[],
  docsRoot: string,
): Promise<void> {
  const BATCH = 5
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH)
    await Promise.allSettled(batch.map(async doc => {
      const filePath  = path.join(docsRoot, doc.folder, doc.filename)
      const extracted = await extractDateFromPDF(filePath)
      if (extracted) {
        await setDocOverride(doc.id, { fecha: extracted })
        // Actualizar caché en memoria para que la próxima petición ya tenga la fecha
        if (_cache) {
          _cache.docs = _cache.docs.map(d =>
            d.id === doc.id ? { ...d, fecha: extracted } : d
          )
        }
      }
    }))
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === '1'

  const docsRoot = path.join(process.cwd(), 'public', 'docs')

  // ── 1. Servir desde caché si está vigente ─────────────────────────────────────
  if (_cache && !refresh && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json({ docs: _cache.docs })
  }

  // ── 2. Listar archivos ────────────────────────────────────────────────────────
  const boletas  = readFolder(docsRoot, 'boletas')
  const facturas = readFolder(docsRoot, 'facturas')

  const all = [
    ...facturas.sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0)),
    ...boletas.sort((a, b)  => (b.numero ?? 0) - (a.numero ?? 0)),
  ]

  // ── 3. Overrides de Supabase (una sola query rápida) ─────────────────────────
  let overrides: Record<string, { fecha?: string; status?: string }> = {}
  try {
    overrides = await getAllDocOverrides()
  } catch {
    // Supabase no disponible — usamos fechas del nombre de archivo
  }

  // ── 4. Merge rápido y guardar en caché ───────────────────────────────────────
  // Para docs sin fecha en Supabase, usamos fecha del nombre de archivo de momento.
  // El background las irá actualizando con la fecha exacta del PDF.
  const merged = all.map(doc => ({
    ...doc,
    fecha: overrides[doc.id]?.fecha ?? doc.fecha,
  }))

  _cache = { docs: merged, ts: Date.now() }

  // ── 5. Extraer fechas PDF en background (no bloquea la respuesta) ─────────────
  const missing = refresh
    ? all
    : all.filter(doc => !overrides[doc.id]?.fecha)

  if (missing.length > 0) {
    extractDatesBackground(missing, docsRoot).catch(console.error)
  }

  return NextResponse.json({ docs: merged })
}
