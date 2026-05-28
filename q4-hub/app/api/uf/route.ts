import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  try {
    const res = await fetch('https://mindicador.cl/api/uf', { next: { revalidate: 3600 } })
    const data = await res.json()
    const latest = data.serie?.[0]
    return NextResponse.json({ value: latest?.valor, date: latest?.fecha?.slice(0, 10) })
  } catch {
    return NextResponse.json({ value: null, date: null }, { status: 500 })
  }
}
