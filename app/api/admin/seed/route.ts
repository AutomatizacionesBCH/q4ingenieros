import { NextResponse } from 'next/server'
import { getProjectsIndex, getProjectDetail } from '@/lib/excel-parser'
import { seedProject, seedProjectDetail } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/seed
 *
 * Reads all project data from the Excel file and writes it to SQLite.
 * Safe to call multiple times — uses UPSERT so it only updates, never duplicates.
 * Takes ~10-30s on the first run (reads 230 project sheets). Subsequent runs
 * are faster because the Excel workbook stays cached in memory.
 */
export async function POST() {
  const startedAt = Date.now()

  try {
    // 1. Seed project index (fast — only reads the Resumen sheet)
    const { projects, stats } = getProjectsIndex()
    for (const summary of projects) {
      await seedProject(summary)
    }

    // 2. Seed project details (reads each project sheet — slower on first run)
    let seeded  = 0
    let skipped = 0
    const errors: { id: number; error: string }[] = []

    for (const summary of projects) {
      try {
        const detail = getProjectDetail(summary.id)
        if (detail) {
          await seedProjectDetail(detail)
          seeded++
        } else {
          // Project exists in Resumen but has no sheet (e.g. project 174)
          skipped++
        }
      } catch (err) {
        errors.push({ id: summary.id, error: String(err) })
      }
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

    return NextResponse.json({
      ok: true,
      elapsed: `${elapsed}s`,
      stats,
      details: { seeded, skipped, errors: errors.length },
      ...(errors.length > 0 ? { errors } : {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/admin/seed]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
