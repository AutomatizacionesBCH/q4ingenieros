-- Add OC PDF fields and fix company name Nobarso → Nobarzo

-- Fix company name in DB
UPDATE "Company" SET "name" = 'Nobarzo SpA' WHERE "name" ILIKE '%nobarso%' OR "name" ILIKE '%novarso%';

-- Add fields to Provider
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "contactName" TEXT;

-- Add fields to PurchaseOrder
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "projectNumber" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "solicitadoPor" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "gerencia" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "cotizacionNum" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "condicionPago" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "tipoMoneda" "Currency" NOT NULL DEFAULT 'CLP';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "retencion" DECIMAL(14, 2);
