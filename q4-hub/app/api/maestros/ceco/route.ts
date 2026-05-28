import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function n(v: unknown): number | null {
  if (v === '' || v == null) return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

function s(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const cecos = await prisma.costCenter.findMany({
    where: companyId ? { companyId: Number(companyId) } : {},
    include: { company: { select: { name: true } } },
    orderBy: { code: 'asc' },
  })
  return NextResponse.json(cecos)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const code = s(body.code)
    const name = s(body.name)
    const companyId = n(body.companyId)

    const errors: string[] = []
    if (!code) errors.push('Código requerido')
    if (!name) errors.push('Nombre requerido')
    if (!companyId) errors.push('Empresa requerida')
    if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 })

    const data: Prisma.CostCenterUncheckedCreateInput = {
      code: code!,
      name: name!,
      companyId: companyId!,
      projectNumber: s(body.projectNumber) ?? undefined,
      location: s(body.location) ?? undefined,
    }

    const ceco = await prisma.costCenter.create({ data })
    return NextResponse.json(ceco, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
