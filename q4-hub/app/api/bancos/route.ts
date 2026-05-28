import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const saldos = await prisma.bankBalance.findMany({
    include: { company: { select: { name: true } } },
    orderBy: { recordedAt: 'desc' },
  })
  return NextResponse.json(saldos)
}

export async function POST(req: Request) {
  const body = await req.json()
  const bb = await prisma.bankBalance.create({ data: body })
  return NextResponse.json(bb, { status: 201 })
}
