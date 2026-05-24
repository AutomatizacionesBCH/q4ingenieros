import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const dbFile = process.env.DB_PATH
      ? path.join(process.env.DB_PATH, 'q4.db')
      : path.join(process.cwd(), 'data', 'q4.db')

    const db = new Database(dbFile, { readonly: true })

    // Schema de todas las tablas
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    ).all() as { name: string }[]

    const result: Record<string, { schema: string; rows: unknown[]; count: number }> = {}

    for (const { name } of tables) {
      const schema = (db.prepare(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
      ).get(name) as { sql: string }).sql

      const count = (db.prepare(`SELECT COUNT(*) as n FROM "${name}"`).get() as { n: number }).n
      // Devuelve las primeras 50 filas
      const rows = db.prepare(`SELECT * FROM "${name}" LIMIT 50`).all()

      result[name] = { schema, count, rows }
    }

    db.close()
    return NextResponse.json({ dbFile, tables: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
