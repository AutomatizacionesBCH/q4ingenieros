import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const providers = await prisma.provider.findMany({
    select: { id: true, name: true, rut: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(providers)
}

export async function POST(req: Request) {
  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const rut = typeof body.rut === 'string' ? body.rut.trim() : ''
  if (!name || !rut) {
    return NextResponse.json({ error: 'Nombre y RUT son requeridos' }, { status: 400 })
  }
  try {
    const p = await prisma.provider.create({
      data: {
        name,
        rut,
        email: typeof body.email === 'string' ? body.email.trim() || null : null,
        phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
      },
    })
    return NextResponse.json(p, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
