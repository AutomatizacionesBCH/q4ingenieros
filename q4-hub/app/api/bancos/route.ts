import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const BANKS = ['CHILE', 'BCI', 'ITAU', 'SANTANDER'] as const
const TYPES = ['CONTABLE', 'LINEA_CREDITO'] as const

export async function GET() {
  const saldos = await prisma.bankBalance.findMany({
    include: { company: { select: { name: true } } },
    orderBy: { recordedAt: 'desc' },
  })
  return NextResponse.json(saldos)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const bank = body.bank
    const type = body.type ?? 'CONTABLE'
    const companyId = Number(body.companyId)
    const balance = Number(body.balance)
    const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date()

    const errors: string[] = []
    if (!BANKS.includes(bank)) errors.push('Banco inválido')
    if (!TYPES.includes(type)) errors.push('Tipo de saldo inválido')
    if (!Number.isFinite(companyId) || companyId <= 0) errors.push('Empresa requerida')
    if (!Number.isFinite(balance)) errors.push('Saldo requerido')
    if (Number.isNaN(recordedAt.getTime())) errors.push('Fecha inválida')

    if (errors.length) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
    }

    const bb = await prisma.bankBalance.create({
      data: {
        bank,
        type,
        companyId,
        balance: new Prisma.Decimal(balance),
        recordedAt,
      },
    })
    return NextResponse.json(bb, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
