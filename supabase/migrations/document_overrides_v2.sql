-- Migración v2: agregar campos editables a document_overrides
-- Ejecutar en Supabase SQL Editor: https://supabase.com/dashboard/project/vgstltszjpbsngzwcleh/sql

ALTER TABLE document_overrides
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS referencia  TEXT;
