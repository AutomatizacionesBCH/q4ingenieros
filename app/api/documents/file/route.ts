import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const BOLETAS_DIR   = process.env.DOCS_BOLETAS_PATH   ?? path.join(process.cwd(), 'public', 'docs', 'boletas')
const FACTURAS_DIR  = process.env.DOCS_FACTURAS_PATH  ?? path.join(process.cwd(), 'public', 'docs', 'facturas')
const PROPUESTAS_DIR = process.env.DOCS_PROPUESTAS_PATH ?? path.join(process.cwd(), 'public', 'docs', 'propuestas')

/**
 * GET /api/documents/file?folder=boletas&name=Boleta+N%C2%B0197+...pdf
 * Streams a PDF from the configured directory.
 * Validates that the resolved path stays within the allowed directories
 * (prevents path traversal attacks).
 */
export async function GET(req: NextRequest) {
  try {
    const folder   = req.nextUrl.searchParams.get('folder')
    const name     = req.nextUrl.searchParams.get('name')

    if (!folder || !name || !['boletas', 'facturas', 'propuestas'].includes(folder)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const baseDir =
      folder === 'boletas'   ? BOLETAS_DIR   :
      folder === 'facturas'  ? FACTURAS_DIR  :
                               PROPUESTAS_DIR

    // Sanitize: only allow basename (strip any directory traversal)
    const safe     = path.basename(name)
    const filePath = path.join(baseDir, safe)

    // Confirm the resolved path is inside the base directory
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
