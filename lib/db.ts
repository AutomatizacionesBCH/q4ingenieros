import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR  = process.env.DB_PATH ?? path.join(process.cwd(), 'data')
const DB_FILE = path.join(DB_DIR, 'q4.db')

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

const db = new Database(DB_FILE)

db.exec(`
  CREATE TABLE IF NOT EXISTS project_edits (
    project_id   INTEGER PRIMARY KEY,
    budget       REAL,
    gross        REAL,
    retention_pct  REAL,
    retention_tipo TEXT,
    egresos      REAL,
    eps          TEXT,
    expenses     TEXT,
    observations TEXT,
    updated_at   TEXT DEFAULT (datetime('now'))
  )
`)

export interface DbEdits {
  budget?:        number
  gross?:         number
  retentionPct?:  number
  retentionTipo?: 'boleta' | 'factura'
  egresos?:       number
  eps?:           Record<number, { label?: string; amount?: number; paid?: boolean }>
  expenses?:      Record<number, { description?: string; amountNet?: number; tipo?: 'boleta' | 'factura' }>
  observations?:  string
}

export function getEdits(projectId: number): DbEdits {
  const row = db.prepare('SELECT * FROM project_edits WHERE project_id = ?').get(projectId) as Record<string, unknown> | undefined
  if (!row) return {}
  return {
    budget:        row.budget        as number | undefined ?? undefined,
    gross:         row.gross         as number | undefined ?? undefined,
    retentionPct:  row.retention_pct as number | undefined ?? undefined,
    retentionTipo: row.retention_tipo as 'boleta' | 'factura' | undefined ?? undefined,
    egresos:       row.egresos       as number | undefined ?? undefined,
    eps:           row.eps      ? JSON.parse(row.eps as string)      : undefined,
    expenses:      row.expenses ? JSON.parse(row.expenses as string) : undefined,
    observations:  row.observations as string | undefined ?? undefined,
  }
}

export function saveEdits(projectId: number, edits: DbEdits): void {
  db.prepare(`
    INSERT INTO project_edits
      (project_id, budget, gross, retention_pct, retention_tipo, egresos, eps, expenses, observations, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(project_id) DO UPDATE SET
      budget         = excluded.budget,
      gross          = excluded.gross,
      retention_pct  = excluded.retention_pct,
      retention_tipo = excluded.retention_tipo,
      egresos        = excluded.egresos,
      eps            = excluded.eps,
      expenses       = excluded.expenses,
      observations   = excluded.observations,
      updated_at     = excluded.updated_at
  `).run(
    projectId,
    edits.budget        ?? null,
    edits.gross         ?? null,
    edits.retentionPct  ?? null,
    edits.retentionTipo ?? null,
    edits.egresos       ?? null,
    edits.eps      ? JSON.stringify(edits.eps)      : null,
    edits.expenses ? JSON.stringify(edits.expenses) : null,
    edits.observations  ?? null,
  )
}
