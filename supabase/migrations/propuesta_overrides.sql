-- Tabla para overrides de Propuestas de Cierre
-- Ejecutar en Supabase SQL Editor: https://supabase.com/dashboard/project/vgstltszjpbsngzwcleh/sql

CREATE TABLE IF NOT EXISTS propuesta_overrides (
  doc_id     TEXT PRIMARY KEY,
  status     TEXT CHECK (status IN ('pendiente', 'firmado')) DEFAULT 'pendiente',
  fecha      DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) — misma política que otras tablas
ALTER TABLE propuesta_overrides ENABLE ROW LEVEL SECURITY;

-- Permitir todo al service role (la app usa service key)
CREATE POLICY "service_role_all" ON propuesta_overrides
  FOR ALL USING (true) WITH CHECK (true);
