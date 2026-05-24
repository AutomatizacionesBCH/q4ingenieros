import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/download-db
 * Formerly downloaded the SQLite file. Now uses Supabase — manage backups
 * directly from the Supabase dashboard: Database → Backups.
 */
export async function GET() {
  return NextResponse.json({
    info: 'La base de datos ahora está en Supabase. Gestiona los backups desde el dashboard de Supabase → Database → Backups.',
    supabaseUrl: process.env.SUPABASE_URL ?? '(no configurado)',
  })
}
