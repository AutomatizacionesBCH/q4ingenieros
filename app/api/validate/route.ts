/**
 * GET /api/validate
 *
 * Compares parsed stats against the control figures defined in CLAUDE.md §6.
 * Returns ok:true only when ALL numbers match exactly.
 */
import { NextResponse } from 'next/server'
import { getProjectsIndex } from '@/lib/excel-parser'
import type { ValidationResult } from '@/types/project'

export const dynamic = 'force-dynamic'

const EXPECTED = {
  total:     230,
  active:    64,
  finalized: 166,
  public:    30,
  private:   189,
  noScope:   11,
}

export async function GET() {
  try {
    const { stats } = getProjectsIndex()

    const mismatches: string[] = []

    for (const [key, expected] of Object.entries(EXPECTED)) {
      const actual = stats[key as keyof typeof EXPECTED]
      if (actual !== expected) {
        mismatches.push(
          `${key}: esperado ${expected}, obtenido ${actual} (diff ${actual - expected})`
        )
      }
    }

    const result: ValidationResult = {
      ok: mismatches.length === 0,
      stats,
      expected: EXPECTED,
      mismatches,
    }

    return NextResponse.json(result, {
      status: result.ok ? 200 : 409,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[GET /api/validate]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
