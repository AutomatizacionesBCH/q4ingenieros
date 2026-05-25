-- Migración v2: reemplaza status/fecha por campos editables de texto
-- Ejecutar en Supabase SQL Editor: https://supabase.com/dashboard/project/vgstltszjpbsngzwcleh/sql

-- Agregar columnas editables (si ya existen, no falla)
ALTER TABLE propuesta_overrides
  ADD COLUMN IF NOT EXISTS contraparte  TEXT,
  ADD COLUMN IF NOT EXISTS proyecto     TEXT,
  ADD COLUMN IF NOT EXISTS especialista TEXT,
  ADD COLUMN IF NOT EXISTS comuna       TEXT;

-- Las columnas status y fecha quedan (no las borramos para no perder datos),
-- pero la app ya no las usa.
