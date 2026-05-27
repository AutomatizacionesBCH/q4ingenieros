import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getDriveFileBuffer } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

const BOLETAS_DIR    = process.env.DOCS_BOLETAS_PATH    ?? path.join(process.cwd(), 'public', 'docs', 'boletas')
const FACTURAS_DIR   = process.env.DOCS_FACTURAS_PATH   ?? path.join(process.cwd(), 'public', 'docs', 'facturas')
const PROPUESTAS_DIR = process.env.DOCS_PROPUESTAS_PATH ?? path.join(process.cwd(), 'public', 'docs', 'propuestas')

/**
 * GET /api/documents/file?folder=boletas&name=Boleta...pdf[&driveId=XXXX]
 *
 * Si se incluye driveId → descarga desde Google Drive API.
 * Si no → lee desde el sistema de archivos local.
 */
export async function GET(req: NextRequest) {
  try {
    const folder  = req.nextUrl.searchParams.get('folder')
    const name    = req.nextUrl.searchParams.get('name')
    const driveId = req.nextUrl.searchParams.get('driveId')

    if (!folder || !name || !['boletas', 'facturas', 'propuestas'].includes(folder)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const safe = path.basename(name)

    // ── Drive path ──────────────────────────────────────────────────────────
    if (driveId) {
      const buffer = await getDriveFileBuffer(driveId)
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `inline; filename="${safe}"`,
          'Content-Length':      String(buffer.length),
          'Cache-Control':       'private, max-age=3600',
        },
      })
    }

    // ── Local path ──────────────────────────────────────────────────────────
    const baseDir =
      folder === 'boletas'   ? BOLETAS_DIR   :
      folder === 'facturas'  ? FACTURAS_DIR  :
                               PROPUESTAS_DIR

    const filePath = path.join(baseDir, safe)

    // Prevenir path traversal
    if (!filePath.startsWith(path.resolve(baseDir))) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    const buffer = fs.readFileSync(filePath)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${safe}"`,
        'Content-Length':      String(buffer.length),
        'Cache-Control':       'private, max-age=3600',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
