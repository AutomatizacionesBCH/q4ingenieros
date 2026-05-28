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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await prisma.closingProposal.findUnique({
    where: { id: Number(id) },
    include: {
      costCenter: { select: { id: true, code: true, name: true } },
      provider: { select: { id: true, name: true, rut: true } },
    },
  })
  if (!p) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json(p)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Prisma.ClosingProposalUncheckedUpdateInput = {}

    if (body.description !== undefined) {
      const desc = s(body.description)
      if (!desc) return NextResponse.json({ error: 'Descripción no puede estar vacía' }, { status: 400 })
      data.description = desc
    }
    if (body.costCenterId !== undefined) data.costCenterId = n(body.costCenterId)
    if (body.providerId !== undefined) data.providerId = n(body.providerId)
    if (body.status !== undefined) data.status = body.status
    if (body.items !== undefined || body.observaciones !== undefined) {
      const existing = await prisma.closingProposal.findUnique({
        where: { id: Number(id) }, select: { content: true },
      })
      const prev = (existing?.content ?? {}) as Record<string, unknown>
      const items = body.items !== undefined ? sanitizeItems(body.items) : (prev.items ?? [])
      const observaciones = body.observaciones !== undefined
        ? (s(body.observaciones) ?? '')
        : (prev.observaciones ?? '')
      data.content = { items, observaciones } as unknown as Prisma.InputJsonValue
    }

    const updated = await prisma.closingProposal.update({ where: { id: Number(id) }, data })
    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.closingProposal.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
