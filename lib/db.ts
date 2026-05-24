import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type {
  ProjectSummary,
  ProjectDetail,
  ProjectsIndex,
  ProjectStats,
  ManagementType,
  ProjectScope,
} from '@/types/project'

const DB_DIR  = process.env.DB_PATH ?? path.join(process.cwd(), 'data')
const DB_FILE = path.join(DB_DIR, 'q4.db')

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

const db = new Database(DB_FILE)

// Enable WAL for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  -- ── Document overrides (fecha + estado por documento tributario) ──────────
  CREATE TABLE IF NOT EXISTS document_overrides (
    doc_id     TEXT PRIMARY KEY,
    status     TEXT NOT NULL DEFAULT 'pendiente',
    fecha      TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Manual status overrides (user-controlled, default = active) ───────────
  CREATE TABLE IF NOT EXISTS project_status_overrides (
    project_id INTEGER PRIMARY KEY,
    status     TEXT NOT NULL DEFAULT 'active',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- ── User overrides (pre-existing) ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS project_edits (
    project_id     INTEGER PRIMARY KEY,
    budget         REAL,
    gross          REAL,
    retention_pct  REAL,
    retention_tipo TEXT,
    egresos        REAL,
    eps            TEXT,
    expenses       TEXT,
    observations   TEXT,
    updated_at     TEXT DEFAULT (datetime('now'))
  );

  -- ── Project index (from Resumen sheet) ────────────────────────────────────
  CREATE TABLE IF NOT EXISTS projects (
    id              INTEGER PRIMARY KEY,
    client          TEXT    NOT NULL DEFAULT '',
    name            TEXT    NOT NULL DEFAULT '',
    start_date      TEXT,
    end_date        TEXT,
    status          TEXT    NOT NULL DEFAULT '',
    is_finalized    INTEGER NOT NULL DEFAULT 0,
    management_type TEXT,
    scope           TEXT,
    project_type    INTEGER,
    synced_at       TEXT DEFAULT (datetime('now'))
  );

  -- ── Financial detail (from individual project sheets) ─────────────────────
  CREATE TABLE IF NOT EXISTS project_details (
    project_id       INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    payment_modality TEXT,
    budget_gross     REAL,
    budget_retention REAL,
    budget_net       REAL,
    total_collected  REAL,
    pending          REAL,
    utility          REAL,
    margin           REAL,
    observations     TEXT,
    synced_at        TEXT DEFAULT (datetime('now'))
  );

  -- ── Estados de Pago ────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS eps (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    idx            INTEGER NOT NULL,
    label          TEXT,
    amount         REAL,
    estimated_date TEXT,
    real_date      TEXT,
    is_paid        INTEGER NOT NULL DEFAULT 0,
    UNIQUE(project_id, idx)
  );

  -- ── Egresos ────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS expenses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    idx             INTEGER NOT NULL,
    description     TEXT    NOT NULL DEFAULT '',
    amount_net      REAL,
    amount_with_tax REAL,
    is_section      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(project_id, idx)
  );
`)

// ─── Seed functions (Excel → SQLite) ─────────────────────────────────────────

const upsertProject = db.prepare(`
  INSERT INTO projects
    (id, client, name, start_date, end_date, status, is_finalized,
     management_type, scope, project_type, synced_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    client          = excluded.client,
    name            = excluded.name,
    start_date      = excluded.start_date,
    end_date        = excluded.end_date,
    status          = excluded.status,
    is_finalized    = excluded.is_finalized,
    management_type = excluded.management_type,
    scope           = excluded.scope,
    project_type    = excluded.project_type,
    synced_at       = excluded.synced_at
`)

const upsertDetail = db.prepare(`
  INSERT INTO project_details
    (project_id, payment_modality, budget_gross, budget_retention, budget_net,
     total_collected, pending, utility, margin, observations, synced_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(project_id) DO UPDATE SET
    payment_modality = excluded.payment_modality,
    budget_gross     = excluded.budget_gross,
    budget_retention = excluded.budget_retention,
    budget_net       = excluded.budget_net,
    total_collected  = excluded.total_collected,
    pending          = excluded.pending,
    utility          = excluded.utility,
    margin           = excluded.margin,
    observations     = excluded.observations,
    synced_at        = excluded.synced_at
`)

const deleteEps      = db.prepare('DELETE FROM eps      WHERE project_id = ?')
const deleteExpenses = db.prepare('DELETE FROM expenses  WHERE project_id = ?')

const insertEp = db.prepare(`
  INSERT INTO eps (project_id, idx, label, amount, estimated_date, real_date, is_paid)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const insertExpense = db.prepare(`
  INSERT INTO expenses (project_id, idx, description, amount_net, amount_with_tax, is_section)
  VALUES (?, ?, ?, ?, ?, ?)
`)

export function seedProject(summary: ProjectSummary): void {
  upsertProject.run(
    summary.id,
    summary.client,
    summary.name,
    summary.startDate,
    summary.endDate,
    summary.status,
    summary.isFinalized ? 1 : 0,
    summary.managementType,
    summary.scope,
    summary.projectType,
  )
}

export const seedProjectDetail = db.transaction((detail: ProjectDetail) => {
  upsertDetail.run(
    detail.id,
    detail.paymentModality,
    detail.budget.gross,
    detail.budget.retention,
    detail.budget.net,
    detail.totalCollected,
    detail.pending,
    detail.utility,
    detail.margin,
    detail.observations,
  )

  deleteEps.run(detail.id)
  for (let i = 0; i < detail.eps.length; i++) {
    const ep = detail.eps[i]
    insertEp.run(
      detail.id, i, ep.label, ep.amount,
      ep.estimatedDate, ep.realDate, ep.isPaid ? 1 : 0,
    )
  }

  deleteExpenses.run(detail.id)
  for (let i = 0; i < detail.expenses.length; i++) {
    const exp = detail.expenses[i]
    insertExpense.run(
      detail.id, i, exp.description,
      exp.amountNet, exp.amountWithTax, exp.isSection ? 1 : 0,
    )
  }
})

// ─── Read functions (SQLite → API types) ──────────────────────────────────────

type RawProject = {
  id: number; client: string; name: string
  start_date: string | null; end_date: string | null
  status: string; is_finalized: number
  management_type: string | null; scope: string | null
  project_type: number | null
}

type RawDetail = {
  payment_modality: string | null
  budget_gross: number | null; budget_retention: number | null; budget_net: number | null
  total_collected: number | null; pending: number | null
  utility: number | null; margin: number | null
  observations: string | null
}

type RawEp = {
  idx: number; label: string | null; amount: number | null
  estimated_date: string | null; real_date: string | null; is_paid: number
}

type RawExpense = {
  idx: number; description: string
  amount_net: number | null; amount_with_tax: number | null; is_section: number
}

function mapProject(row: RawProject): ProjectSummary {
  return {
    id:             row.id,
    client:         row.client,
    name:           row.name,
    startDate:      row.start_date,
    endDate:        row.end_date,
    status:         row.status,
    isFinalized:    row.is_finalized === 1,
    managementType: row.management_type as ManagementType,
    scope:          row.scope as ProjectScope,
    projectType:    row.project_type,
  }
}

export function isDBSeeded(): boolean {
  const row = db.prepare('SELECT COUNT(*) as n FROM projects').get() as { n: number }
  return row.n > 0
}

export function getProjectsFromDB(): ProjectsIndex | null {
  if (!isDBSeeded()) return null
  const rows = db.prepare('SELECT * FROM projects ORDER BY id').all() as RawProject[]
  const projects = rows.map(mapProject)
  const stats: ProjectStats = {
    total:     projects.length,
    active:    projects.filter(p => !p.isFinalized).length,
    finalized: projects.filter(p => p.isFinalized).length,
    public:    projects.filter(p => p.scope === 'Público').length,
    private:   projects.filter(p => p.scope === 'Privado').length,
    noScope:   projects.filter(p => p.scope === null).length,
  }
  return { projects, stats }
}

export function getProjectDetailFromDB(id: number): ProjectDetail | null {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as RawProject | undefined
  if (!project) return null

  const detail = db.prepare('SELECT * FROM project_details WHERE project_id = ?').get(id) as RawDetail | undefined
  const epsRows = db.prepare('SELECT * FROM eps WHERE project_id = ? ORDER BY idx').all(id) as RawEp[]
  const expRows = db.prepare('SELECT * FROM expenses WHERE project_id = ? ORDER BY idx').all(id) as RawExpense[]

  return {
    ...mapProject(project),
    paymentModality: detail?.payment_modality ?? null,
    budget: {
      gross:     detail?.budget_gross     ?? null,
      retention: detail?.budget_retention ?? null,
      net:       detail?.budget_net       ?? null,
    },
    eps: epsRows.map(ep => ({
      label:         ep.label ?? '',
      amount:        ep.amount,
      estimatedDate: ep.estimated_date,
      realDate:      ep.real_date,
      isPaid:        ep.is_paid === 1,
    })),
    expenses: expRows.map(exp => ({
      description:   exp.description,
      amountNet:     exp.amount_net,
      amountWithTax: exp.amount_with_tax,
      isSection:     exp.is_section === 1,
    })),
    totalCollected: detail?.total_collected ?? null,
    pending:        detail?.pending         ?? null,
    utility:        detail?.utility         ?? null,
    margin:         detail?.margin          ?? null,
    observations:   detail?.observations    ?? null,
  }
}

// ─── Edits (user overrides) ───────────────────────────────────────────────────

export interface DbEdits {
  budget?:        number
  gross?:         number
  retentionPct?:  number
  retentionTipo?: 'boleta' | 'factura'
  egresos?:       number
  eps?:           Record<number, { label?: string; amount?: number; paid?: boolean }>
  expenses?:      Record<number, { description?: string; amountNet?: number; tipo?: 'boleta' | 'factura'; paid?: boolean }>
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

// ─── Manual status overrides ──────────────────────────────────────────────────

export function getAllStatusOverrides(): Record<number, 'active' | 'finalized'> {
  const rows = db.prepare('SELECT project_id, status FROM project_status_overrides').all() as { project_id: number; status: string }[]
  const result: Record<number, 'active' | 'finalized'> = {}
  for (const row of rows) {
    result[row.project_id] = row.status as 'active' | 'finalized'
  }
  return result
}

export function setStatusOverride(projectId: number, status: 'active' | 'finalized'): void {
  db.prepare(`
    INSERT INTO project_status_overrides (project_id, status, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(project_id) DO UPDATE SET
      status     = excluded.status,
      updated_at = excluded.updated_at
  `).run(projectId, status)
}

// ─── Document overrides (fecha + estado) ──────────────────────────────────────

export interface DocOverride {
  status?: 'pagado' | 'pendiente'
  fecha?:  string   // YYYY-MM-DD
}

export function getAllDocOverrides(): Record<string, DocOverride> {
  const rows = db.prepare('SELECT doc_id, status, fecha FROM document_overrides').all() as { doc_id: string; status: string; fecha: string | null }[]
  const result: Record<string, DocOverride> = {}
  for (const row of rows) {
    result[row.doc_id] = {
      status: row.status as 'pagado' | 'pendiente',
      fecha:  row.fecha ?? undefined,
    }
  }
  return result
}

export function setDocOverride(docId: string, override: DocOverride): void {
  db.prepare(`
    INSERT INTO document_overrides (doc_id, status, fecha, updated_at)
    VALUES (?, COALESCE(?, 'pendiente'), ?, datetime('now'))
    ON CONFLICT(doc_id) DO UPDATE SET
      status     = COALESCE(excluded.status, status),
      fecha      = COALESCE(excluded.fecha,  fecha),
      updated_at = excluded.updated_at
  `).run(docId, override.status ?? null, override.fecha ?? null)
}
