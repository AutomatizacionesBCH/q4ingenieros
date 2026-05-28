import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  const body = await req.json()
  const ceco = await prisma.costCenter.create({ data: body })
  return NextResponse.json(ceco, { status: 201 })
}
