import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  const body = await req.json()
  const propuesta = await prisma.closingProposal.create({ data: body })
  return NextResponse.json(propuesta, { status: 201 })
}
