import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/download-db
 * Downloads the q4.db SQLite file directly.
 * Open with DB Browser for SQLite (https://sqlitebrowser.org/)
 */
export async function GET() {
  try {
    const dbFile = process.env.DB_PATH
      ? path.join(process.env.DB_PATH, 'q4.db')
      : path.join(process.cwd(), 'data', 'q4.db')

    if (!fs.existsSync(dbFile)) {
      return NextResponse.json({ error: 'Base de datos no encontrada' }, { status: 404 })
    }

    const buffer = fs.readFileSync(dbFile)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/octet-stream',
        'Content-Disposition': 'attachment; filename="q4.db"',
        'Content-Length':      String(buffer.length),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
