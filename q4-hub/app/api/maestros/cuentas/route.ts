import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function s(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export async function GET() {
  const accounts = await prisma.account.findMany({
    include: { categories: { orderBy: { name: 'asc' } } },
    orderBy: { code: 'asc' },
  })
  return NextResponse.json(accounts)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const code = s(body.code)
    const name = s(body.name)
    const movementType = body.movementType

    const errors: string[] = []
    if (!code) errors.push('Código requerido')
    if (!name) errors.push('Nombre requerido')
    if (movementType !== 'INGRESO' && movementType !== 'EGRESO') errors.push('Tipo de movimiento inválido')
    if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 })

    const categoryNames: string[] = Array.isArray(body.categories)
      ? (body.categories as unknown[]).map(c => s(c)).filter((x): x is string => x !== null)
      : []

    const data: Prisma.AccountUncheckedCreateInput = {
      code: code!,
      name: name!,
      movementType,
      ...(categoryNames.length ? { categories: { create: categoryNames.map(name => ({ name })) } } : {}),
    }

    const account = await prisma.account.create({ data, include: { categories: true } })
    return NextResponse.json(account, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
