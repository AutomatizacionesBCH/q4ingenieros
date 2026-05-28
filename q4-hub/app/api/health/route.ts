export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {}

  checks.env_database_url = { ok: !!process.env.DATABASE_URL, detail: process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 50) + '…' : 'NOT SET' }
  checks.env_supabase_url = { ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL, detail: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NOT SET' }
  checks.prisma_binary = { ok: !!process.env.PRISMA_QUERY_ENGINE_LIBRARY, detail: process.env.PRISMA_QUERY_ENGINE_LIBRARY ?? 'auto-detect (puede fallar)' }

  try {
    await prisma.$queryRaw`SELECT 1`
    const txCount = await prisma.transaction.count()
    const companies = await prisma.company.count()
    checks.database = { ok: true, detail: `${txCount} transacciones, ${companies} empresas` }
  } catch (e) {
    const err = e as Error
    checks.database = { ok: false, detail: err.message }
  }

  const allOk = Object.values(checks).every(c => c.ok)

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', timestamp: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503 }
  )
}
