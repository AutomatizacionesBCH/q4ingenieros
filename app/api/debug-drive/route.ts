import { NextResponse } from 'next/server'
import { isDriveConfigured, listDrivePDFs } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug-drive
 * Diagnóstico de la configuración de Google Drive.
 * NO expone credenciales — solo confirma presencia y prueba el acceso.
 */
export async function GET() {
  const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const boletasId         = process.env.DRIVE_BOLETAS_FOLDER_ID   ?? null
  const facturasId        = process.env.DRIVE_FACTURAS_FOLDER_ID  ?? null
  const propuestasId      = process.env.DRIVE_PROPUESTAS_FOLDER_ID ?? null

  const config = {
    GOOGLE_SERVICE_ACCOUNT_JSON: hasServiceAccount ? `✓ presente (${process.env.GOOGLE_SERVICE_ACCOUNT_JSON!.length} chars)` : '✗ ausente',
    DRIVE_BOLETAS_FOLDER_ID:    boletasId   ?? '✗ ausente',
    DRIVE_FACTURAS_FOLDER_ID:   facturasId  ?? '✗ ausente',
    DRIVE_PROPUESTAS_FOLDER_ID: propuestasId ?? '✗ ausente',
    isDriveConfigured:          isDriveConfigured(),
    useDrive:                   isDriveConfigured() && !!(boletasId || facturasId),
  }

  // Si Drive está configurado, probar listado real
  const tests: Record<string, string> = {}
  if (isDriveConfigured()) {
    if (boletasId) {
      try {
        const files = await listDrivePDFs(boletasId)
        tests.boletas = `✓ ${files.length} archivos encontrados`
      } catch (e) {
        tests.boletas = `✗ Error: ${String(e)}`
      }
    }
    if (facturasId) {
      try {
        const files = await listDrivePDFs(facturasId)
        tests.facturas = `✓ ${files.length} archivos encontrados`
      } catch (e) {
        tests.facturas = `✗ Error: ${String(e)}`
      }
    }
    if (propuestasId) {
      try {
        const files = await listDrivePDFs(propuestasId)
        tests.propuestas = `✓ ${files.length} archivos encontrados`
      } catch (e) {
        tests.propuestas = `✗ Error: ${String(e)}`
      }
    }
  }

  return NextResponse.json({ config, tests }, { status: 200 })
}
