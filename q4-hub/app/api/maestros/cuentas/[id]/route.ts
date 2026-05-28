import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function s(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const account = await prisma.account.findUnique({
    where: { id: Number(id) },
    include: { categories: { orderBy: { name: 'asc' } } },
  })
  if (!account) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json(account)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const accountId = Number(id)
    const body = await req.json()

    const data: Prisma.AccountUncheckedUpdateInput = {}
    if (body.code !== undefined) {
      const code = s(body.code)
      if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
      data.code = code
    }
    if (body.name !== undefined) {
      const name = s(body.name)
      if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
      data.name = name
    }
    if (body.movementType !== undefined) data.movementType = body.movementType

    // Sincronización de categorías: si vienen, reemplazo el set completo
    if (Array.isArray(body.categories)) {
      const incoming = (body.categories as unknown[])
        .map(c => {
          if (!c || typeof c !== 'object') return null
          const r = c as Record<string, unknown>
          const name = s(r.name)
          if (!name) return null
          const cid = r.id != null && r.id !== '' ? Number(r.id) : null
          return { id: cid, name }
        })
        .filter((x): x is { id: number | null; name: string } => x !== null)

      const existing = await prisma.category.findMany({
        where: { accountId },
        select: { id: true, name: true },
      })

      const incomingIds = new Set(incoming.filter(c => c.id != null).map(c => c.id as number))
      const toDelete = existing.filter(e => !incomingIds.has(e.id)).map(e => e.id)

      await prisma.$transaction([
        // Update
        ...incoming
          .filter(c => c.id != null)
          .map(c => prisma.category.update({ where: { id: c.id as number }, data: { name: c.name } })),
        // Create
        ...incoming
          .filter(c => c.id == null)
          .map(c => prisma.category.create({ data: { name: c.name, accountId } })),
        // Delete
        ...(toDelete.length ? [prisma.category.deleteMany({ where: { id: { in: toDelete } } })] : []),
        // Update account fields
        prisma.account.update({ where: { id: accountId }, data }),
      ])
    } else if (Object.keys(data).length > 0) {
      await prisma.account.update({ where: { id: accountId }, data })
    }

    const updated = await prisma.account.findUnique({
      where: { id: accountId },
      include: { categories: { orderBy: { name: 'asc' } } },
    })
    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const accountId = Number(id)
    const txCount = await prisma.transaction.count({ where: { accountId } })
    if (txCount > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: hay ${txCount} transacción(es) asociadas.`,
      }, { status: 400 })
    }
    await prisma.$transaction([
      prisma.category.deleteMany({ where: { accountId } }),
      prisma.account.delete({ where: { id: accountId } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
