import { NextResponse } from 'next/server'

// Server-side cache — persists across requests during the process lifetime
let cache: { value: number; date: string; fetchedAt: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json(cache)
  }

  try {
    const res  = await fetch('https://mindicador.cl/api/uf', { cache: 'no-store' })
    const data = await res.json() as { serie?: { valor: number; fecha: string }[] }
    const last = data.serie?.[0]
    if (!last) throw new Error('empty serie')

    cache = { value: last.valor, date: last.fecha.slice(0, 10), fetchedAt: Date.now() }
    return NextResponse.json(cache)
  } catch {
    if (cache) return NextResponse.json(cache)           // serve stale if fetch fails
    return NextResponse.json({ error: 'No disponible' }, { status: 502 })
  }
}
