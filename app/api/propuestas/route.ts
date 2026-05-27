import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import { getPropuestaOverrides } from '@/lib/db'
import type { PropuestaItem, DocType } from '@/lib/propuesta-utils'
import { isDriveConfigured, listDrivePDFs, getDriveFileBuffer } from '@/lib/google-drive'

export type { PropuestaItem, DocType }
export const dynamic = 'force-dynamic'

const PROPUESTAS_DIR      = process.env.DOCS_PROPUESTAS_PATH ?? path.join(process.cwd(), 'public', 'docs', 'propuestas')
const DRIVE_PROPUESTAS_ID = process.env.DRIVE_PROPUESTAS_FOLDER_ID

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

// ── URL builder ────────────────────────────────────────────────────────────────
function buildUrl(filename: string, driveFileId?: string): string {
  const params = new URLSearchParams({ folder: 'propuestas', name: filename })
  if (driveFileId) params.set('driveId', driveFileId)
  return `/api/documents/file?${params.toString()}`
}

// ── PCE parser (accepts buffer) ────────────────────────────────────────────────
async function parsePCE(buf: Buffer, filename: string, driveFileId?: string): Promise<PropuestaItem> {
  const m = filename.match(/^(\d+)-(\d+)-PCE_([A-Z]+)-([A-Z]+)\.pdf$/i)
  const proyectoId  = m ? parseInt(m[1]) : null
  const version     = m ? m[2] : '01'
  const tipo        = m ? m[3].toUpperCase() : 'PCE'
  const locCode     = m ? m[4].toUpperCase() : ''
  const codigo      = proyectoId ? `P-${proyectoId}` : filename.replace('.pdf', '')

  try {
    const data  = await pdfParse(buf)
    const text  = data.text
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)

    const contraparteMatch = text.match(/Q4 INGENIEROS\s*[–\-]\s*(.+)/i)
    const contraparte  = contraparteMatch ? contraparteMatch[1].trim().replace(/\s+/g, ' ') : ''
    const proyecto     = extractLine(lines, 'Proyecto')
    const comunaRaw    = extractLine(lines, 'Comuna')
    const especialista = extractLine(lines, 'Especialista') || contraparte

    return {
      id: filename.replace(/\.pdf$/i, ''),
      docType: 'PCE',
      proyectoId, version, tipo, locCode, codigo,
      contraparte,
      proyecto: proyecto || filename,
      especialista,
      comuna: comunaRaw || null,
      url: buildUrl(filename, driveFileId),
    }
  } catch {
    return {
      id: filename.replace(/\.pdf$/i, ''),
      docType: 'PCE',
      proyectoId, version, tipo, locCode, codigo,
      contraparte: '', proyecto: filename, especialista: '', comuna: null,
      url: buildUrl(filename, driveFileId),
    }
  }
}

// ── OC parser (accepts buffer) ─────────────────────────────────────────────────
async function parseOC(buf: Buffer, filename: string, driveFileId?: string): Promise<PropuestaItem> {
  const m = filename.match(/^(\d+)_OC\s+N[°o]([\d\-]+)\s*-\s*(.+)\.pdf$/i)
  const proyectoId  = m ? parseInt(m[1]) : null
  const ocNumber    = m ? m[2] : ''
  const contraparte = m ? m[3].trim() : filename.replace('.pdf', '')
  const codigo      = ocNumber ? `OC-${ocNumber}` : 'OC'

  let proyecto = ''
  try {
    const data  = await pdfParse(buf)
    const text  = data.text
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const descIdx = lines.findIndex(l =>
      /Producto\s*\/\s*Servicio/i.test(l) || /DESCRIPCIÓN/i.test(l)
    )
    if (descIdx >= 0 && lines[descIdx + 1]) proyecto = lines[descIdx + 1].trim()
  } catch { /* ignore */ }

  return {
    id:           filename.replace(/\.pdf$/i, ''),
    docType:      'OC',
    proyectoId,
    ocNumber,
    codigo,
    contraparte,
    proyecto:     proyecto || `Orden de Compra N°${ocNumber}`,
    especialista: contraparte,
    comuna:       null,
    url:          buildUrl(filename, driveFileId),
  }
}

// ── Parse one file (local or Drive buffer) ─────────────────────────────────────
async function parseFile(
  filename:    string,
  buf:         Buffer,
  driveFileId?: string,
): Promise<PropuestaItem | null> {
  if (/^[\d]+-\d+-PCE_/i.test(filename)) return parsePCE(buf, filename, driveFileId)
  if (/_OC\s+N[°o]/i.test(filename))     return parseOC(buf, filename, driveFileId)
  return null
}

// ── Module-level cache ────────────────────────────────────────────────────────
let cache: PropuestaItem[] | null = null

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === '1'

  if (!cache || refresh) {
    const useDrive = isDriveConfigured() && !!DRIVE_PROPUESTAS_ID

    let fileEntries: { filename: string; buf: Buffer; driveFileId?: string }[] = []

    if (useDrive) {
      // ── Google Drive ───────────────────────────────────────────────────────
      const driveFiles = await listDrivePDFs(DRIVE_PROPUESTAS_ID!)
      const pdfs = driveFiles.filter(f => /\.pdf$/i.test(f.name))
      // Download all in parallel (propuestas folder is small)
      const results = await Promise.allSettled(
        pdfs.map(async f => ({
          filename:    f.name,
          buf:         await getDriveFileBuffer(f.id),
          driveFileId: f.id,
        }))
      )
      for (const r of results) {
        if (r.status === 'fulfilled') fileEntries.push(r.value)
      }
    } else {
      // ── Local file system ──────────────────────────────────────────────────
      if (!fs.existsSync(PROPUESTAS_DIR)) {
        cache = []
      } else {
        const files = fs.readdirSync(PROPUESTAS_DIR).filter(f => /\.pdf$/i.test(f)).sort()
        for (const f of files) {
          try {
            const buf = fs.readFileSync(path.join(PROPUESTAS_DIR, f))
            fileEntries.push({ filename: f, buf })
          } catch { /* skip */ }
        }
      }
    }

    if (!cache) {
      const parsed = await Promise.all(
        fileEntries.map(e => parseFile(e.filename, e.buf, e.driveFileId))
      )
      cache = (parsed.filter(Boolean) as PropuestaItem[])
        .sort((a, b) => {
          const idDiff = (a.proyectoId ?? 9999) - (b.proyectoId ?? 9999)
          if (idDiff !== 0) return idDiff
          if (a.docType === 'PCE' && b.docType === 'OC') return -1
          if (a.docType === 'OC' && b.docType === 'PCE') return  1
          return a.id.localeCompare(b.id)
        })
    }
  }

  // ── Supabase overrides ─────────────────────────────────────────────────────
  let overrides: Record<string, import('@/lib/db').PropuestaOverride> = {}
  try { overrides = await getPropuestaOverrides() } catch { /* offline */ }

  // ── Merge ──────────────────────────────────────────────────────────────────
  const merged = cache.map(p => {
    const ov = overrides[p.id]
    if (!ov) return p
    return {
      ...p,
      contraparte:  ov.contraparte  ?? p.contraparte,
      proyecto:     ov.proyecto     ?? p.proyecto,
      especialista: ov.especialista ?? p.especialista,
      comuna:       ov.comuna       ?? p.comuna,
    }
  })

  return NextResponse.json({ propuestas: merged })
}
