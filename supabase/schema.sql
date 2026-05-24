-- ══════════════════════════════════════════════════════════════════════════════
-- Q4 Ingenieros Dashboard — Schema para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → "Run"
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Documentos tributarios (fecha + estado Pagado/Pendiente) ──────────────────
CREATE TABLE IF NOT EXISTS document_overrides (
  doc_id     TEXT PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'pendiente',
  fecha      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Estado manual de proyectos (Activo / Finalizado) ─────────────────────────
CREATE TABLE IF NOT EXISTS project_status_overrides (
  project_id INTEGER PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ediciones de usuario (presupuesto, egresos, etc.) ────────────────────────
CREATE TABLE IF NOT EXISTS project_edits (
  project_id     INTEGER PRIMARY KEY,
  budget         FLOAT8,
  gross          FLOAT8,
  retention_pct  FLOAT8,
  retention_tipo TEXT,
  egresos        FLOAT8,
  eps            TEXT,          -- JSON serializado
  expenses       TEXT,          -- JSON serializado
  observations   TEXT,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índice de proyectos (del Excel, hoja Resumen) ────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              INTEGER PRIMARY KEY,
  client          TEXT NOT NULL DEFAULT '',
  name            TEXT NOT NULL DEFAULT '',
  start_date      TEXT,
  end_date        TEXT,
  status          TEXT NOT NULL DEFAULT '',
  is_finalized    BOOLEAN NOT NULL DEFAULT FALSE,
  management_type TEXT,
  scope           TEXT,
  project_type    INTEGER,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Detalle financiero por proyecto ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_details (
  project_id       INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  payment_modality TEXT,
  budget_gross     FLOAT8,
  budget_retention FLOAT8,
  budget_net       FLOAT8,
  total_collected  FLOAT8,
  pending          FLOAT8,
  utility          FLOAT8,
  margin           FLOAT8,
  observations     TEXT,
  synced_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Estados de Pago ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eps (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  idx            INTEGER NOT NULL,
  label          TEXT,
  amount         FLOAT8,
  estimated_date TEXT,
  real_date      TEXT,
  is_paid        BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(project_id, idx)
);

-- ── Egresos ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  idx             INTEGER NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  amount_net      FLOAT8,
  amount_with_tax FLOAT8,
  is_section      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(project_id, idx)
);
