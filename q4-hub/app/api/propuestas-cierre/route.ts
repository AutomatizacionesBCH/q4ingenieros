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

function sanitizeItems(raw: unknown): { descripcion: string; monto: number }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(it => {
      if (!it || typeof it !== 'object') return null
      const r = it as Record<string, unknown>
      const desc = s(r.descripcion)
      const monto = n(r.monto)
      if (!desc || monto == null) return null
      return { descripcion: desc, monto }
    })
    .filter((x): x is { descripcion: string; monto: number } => x !== null)
}

export async function GET() {
  const propuestas = await prisma.closingProposal.findMany({
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(propuestas)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const description = s(body.description)
    if (!description) {
      return NextResponse.json({ error: 'Descripción es requerida' }, { status: 400 })
    }

    const items = sanitizeItems(body.items)
    const observaciones = s(body.observaciones) ?? ''
    const content = { items, observaciones }

    const data: Prisma.ClosingProposalUncheckedCreateInput = {
      description,
      content: content as unknown as Prisma.InputJsonValue,
      costCenterId: n(body.costCenterId) ?? undefined,
      providerId: n(body.providerId) ?? undefined,
      status: body.status ?? 'BORRADOR',
    }

    const propuesta = await prisma.closingProposal.create({ data })
    return NextResponse.json(propuesta, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
