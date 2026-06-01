import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const BANKS = ['CHILE', 'BCI', 'ITAU', 'SANTANDER']
const TYPES = ['CONTABLE', 'LINEA_CREDITO']

function n(v: unknown): number | null {
  if (v === '' || v == null) return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Prisma.BankBalanceUncheckedUpdateInput = {}

    if (body.bank !== undefined) {
      if (!BANKS.includes(body.bank)) return NextResponse.json({ error: 'Banco inválido' }, { status: 400 })
      data.bank = body.bank
    }
    if (body.type !== undefined) {
      if (!TYPES.includes(body.type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
      data.type = body.type
    }
    if (body.companyId !== undefined) {
      const c = n(body.companyId)
      if (!c) return NextResponse.json({ error: 'Empresa requerida' }, { status: 400 })
      data.companyId = c
    }
    if (body.balance !== undefined) {
      const b = n(body.balance)
      if (b == null) return NextResponse.json({ error: 'Saldo inválido' }, { status: 400 })
      data.balance = new Prisma.Decimal(b)
    }
    if (body.recordedAt !== undefined) {
      const d = body.recordedAt ? new Date(body.recordedAt) : null
      if (!d || Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
      data.recordedAt = d
    }

    const bb = await prisma.bankBalance.update({ where: { id: Number(id) }, data })
    return NextResponse.json(bb)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.bankBalance.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
