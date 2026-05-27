import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import { getAllDocOverrides, setDocOverride } from '@/lib/db'
import { isDriveConfigured, listDrivePDFs, getDriveFileBuffer } from '@/lib/google-drive'

// Suppress pdf-parse test-file noise in production logs
process.env['PDFJS_DISABLE_WORKER'] = '1'

export const dynamic = 'force-dynamic'

// ── Paths (local fallback cuando Drive no está configurado) ───────────────────
const BOLETAS_PATH   = process.env.DOCS_BOLETAS_PATH   ?? path.join(process.cwd(), 'public', 'docs', 'boletas')
const FACTURAS_PATH  = process.env.DOCS_FACTURAS_PATH  ?? path.join(process.cwd(), 'public', 'docs', 'facturas')

// ── Drive folder IDs (opcionales — cuando están configurados se usa Drive API) ─
const DRIVE_BOLETAS_ID   = process.env.DRIVE_BOLETAS_FOLDER_ID
const DRIVE_FACTURAS_ID  = process.env.DRIVE_FACTURAS_FOLDER_ID

// ── Caché a nivel de módulo ───────────────────────────────────────────────────
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
  fecha:       string | null   // YYYY-MM-DD
  url:         string          // /api/documents/file?...
  driveFileId?: string         // sólo si viene de Drive
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

// ── Find the FIRST date in extracted PDF text ─────────────────────────────────
function findFirstDateInText(text: string): string | null {
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

// ── Extract date from a buffer (pdf-parse) ────────────────────────────────────
async function extractDateFromBuffer(buf: Buffer): Promise<string | null> {
  try {
    const data = await pdfParse(buf)
    return findFirstDateInText(data.text)
  } catch {
    return null
  }
}

// ── Parser ────────────────────────────────────────────────────────────────────
function parseDoc(
  filename:    string,
  folder:      'boletas' | 'facturas',
  driveFileId?: string,
): DocItem {
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

  const urlParams = new URLSearchParams({ folder, name: filename })
  if (driveFileId) urlParams.set('driveId', driveFileId)

  return {
    id:    `${folder}/${filename}`,
    filename,
    folder,
    tipo,
    numero,
    descripcion,
    referencia,
    fecha: extractDateFromFilename(base),
    url:   `/api/documents/file?${urlParams.toString()}`,
    driveFileId,
  }
}

// ── Read from local file system ───────────────────────────────────────────────
function readFolderLocal(dir: string, folder: 'boletas' | 'facturas'): DocItem[] {
  if (!fs.existsSync(dir)) return []
  try {
    return fs.readdirSync(dir)
      .filter(f => /\.pdf$/i.test(f))
      .map(f => parseDoc(f, folder))
  } catch {
    return []
  }
}

// ── Read from Google Drive ────────────────────────────────────────────────────
async function readFolderDrive(folderId: string, folder: 'boletas' | 'facturas'): Promise<DocItem[]> {
  const files = await listDrivePDFs(folderId)
  return files
    .filter(f => /\.pdf$/i.test(f.name))
    .map(f => parseDoc(f.name, folder, f.id))
}

// ── Background date extraction ────────────────────────────────────────────────
async function extractDatesBackground(missing: DocItem[]): Promise<void> {
  const BATCH = 5
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH)
    await Promise.allSettled(batch.map(async doc => {
      let buf: Buffer | null = null

      if (doc.driveFileId) {
        // Drive: download buffer
        try { buf = await getDriveFileBuffer(doc.driveFileId) } catch { return }
      } else {
        // Local: read from disk
        const dir = doc.folder === 'boletas' ? BOLETAS_PATH : FACTURAS_PATH
        const fp  = path.join(dir, doc.filename)
        if (!fs.existsSync(fp)) return
        try { buf = fs.readFileSync(fp) } catch { return }
      }

      if (!buf) return
      const extracted = await extractDateFromBuffer(buf)
      if (extracted) {
        await setDocOverride(doc.id, { fecha: extracted })
        if (_cache) {
          _cache.docs = _cache.docs.map(d =>
            d.id === doc.id ? { ...d, fecha: extracted } : d
          )
        }
      }
    }))
  }
}

// ── GET /api/documents ────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === '1'

  // 1. Caché vigente
  if (_cache && !refresh && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json({ docs: _cache.docs })
  }

  // 2. Listar archivos — Drive si está configurado, local si no
  const useDrive = isDriveConfigured() && (DRIVE_BOLETAS_ID || DRIVE_FACTURAS_ID)

  let boletas:  DocItem[] = []
  let facturas: DocItem[] = []

  if (useDrive) {
    ;[boletas, facturas] = await Promise.all([
      DRIVE_BOLETAS_ID  ? readFolderDrive(DRIVE_BOLETAS_ID,  'boletas')  : Promise.resolve([]),
      DRIVE_FACTURAS_ID ? readFolderDrive(DRIVE_FACTURAS_ID, 'facturas') : Promise.resolve([]),
    ])
  } else {
    boletas  = readFolderLocal(BOLETAS_PATH,  'boletas')
    facturas = readFolderLocal(FACTURAS_PATH, 'facturas')
  }

  const all = [
    ...facturas.sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0)),
    ...boletas.sort((a, b)  => (b.numero ?? 0) - (a.numero ?? 0)),
  ]

  // 3. Overrides de Supabase
  let overrides: Record<string, { fecha?: string; status?: string }> = {}
  try {
    overrides = await getAllDocOverrides()
  } catch {
    // Supabase no disponible
  }

  // 4. Merge y caché
  const merged = all.map(doc => ({
    ...doc,
    fecha: overrides[doc.id]?.fecha ?? doc.fecha,
  }))

  _cache = { docs: merged, ts: Date.now() }

  // 5. Extraer fechas PDF en background
  const missing = refresh
    ? all
    : all.filter(doc => !overrides[doc.id]?.fecha)

  if (missing.length > 0) {
    extractDatesBackground(missing).catch(console.error)
  }

  return NextResponse.json({ docs: merged })
}
