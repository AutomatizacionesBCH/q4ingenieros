import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '100')

  const where = {
    ...(companyId ? { companyId: Number(companyId) } : {}),
    ...(status ? { status: status as 'PAGADO' | 'PENDIENTE' | 'NULO' } : {}),
    ...(from || to ? {
      paymentDate: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    } : {}),
  }

  const [total, txs] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: {
        costCenter: { select: { code: true, name: true } },
        account: { select: { code: true, name: true } },
        provider: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return NextResponse.json({ total, page, limit, data: txs })
}

export async function POST(req: Request) {
  const body = await req.json()
  const tx = await prisma.transaction.create({ data: body })
  return NextResponse.json(tx, { status: 201 })
}
