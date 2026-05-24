import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const TABLES = [
  'projects',
  'project_details',
  'eps',
  'expenses',
  'project_edits',
  'project_status_overrides',
  'document_overrides',
] as const

export async function GET() {
  try {
    const counts: Record<string, number> = {}

    for (const table of TABLES) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      counts[table] = count ?? 0
    }

    return NextResponse.json({
      provider: 'supabase',
      url: process.env.SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co',
      tables: counts,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
