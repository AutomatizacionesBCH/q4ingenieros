/**
 * Corre antes de `node server.js` en el container de producción.
 * Usa @prisma/client (ya copiado en runner stage) para ejecutar
 * las ALTER TABLE idempotentes sin necesitar el Prisma CLI.
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SQL = [
  // Nobarzo rename
  `UPDATE "Company" SET "name" = 'Nobarzo SpA' WHERE "name" ILIKE '%nobarso%' OR "name" ILIKE '%novarso%'`,

  // Provider — campos PDF
  `ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "address" TEXT`,
  `ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "city" TEXT`,
  `ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "contactName" TEXT`,

  // PurchaseOrder — company relation (solo Prisma-level, companyId ya existe)
  // PurchaseOrder — campos PDF y nuevo formulario
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "projectNumber" TEXT`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "solicitadoPor" TEXT`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "gerencia" TEXT`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "cotizacionNum" TEXT`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "condicionPago" TEXT`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "tipoMoneda" "Currency" NOT NULL DEFAULT 'CLP'`,
  `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "retencion" DECIMAL(14, 2)`,

  // Eliminar IDQ4 (no existe como empresa) — solo si no tiene datos asociados (idempotente y seguro).
  `DELETE FROM "Company" c
   WHERE c."rut" = '76000002-2'
     AND NOT EXISTS (SELECT 1 FROM "Transaction"   t WHERE t."companyId" = c."id")
     AND NOT EXISTS (SELECT 1 FROM "CostCenter"    cc WHERE cc."companyId" = c."id")
     AND NOT EXISTS (SELECT 1 FROM "IssuedInvoice" i WHERE i."companyId" = c."id")
     AND NOT EXISTS (SELECT 1 FROM "PurchaseOrder" p WHERE p."companyId" = c."id")
     AND NOT EXISTS (SELECT 1 FROM "BankBalance"   b WHERE b."companyId" = c."id")
     AND NOT EXISTS (SELECT 1 FROM "User"          u WHERE u."companyId" = c."id")`,
]

async function main() {
  console.log('[migrate] Iniciando migraciones de runtime...')
  for (const sql of SQL) {
    try {
      await prisma.$executeRawUnsafe(sql)
      console.log('[migrate] OK:', sql.slice(0, 70))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // "already exists" es OK — la columna ya fue agregada antes
      if (msg.includes('already exists') || msg.includes('duplicate column')) {
        console.log('[migrate] YA EXISTE (ok):', sql.slice(0, 70))
      } else {
        console.error('[migrate] ERROR:', msg, '→', sql.slice(0, 70))
      }
    }
  }
  console.log('[migrate] Listo.')
}

main()
  .catch(e => { console.error('[migrate] FATAL:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
