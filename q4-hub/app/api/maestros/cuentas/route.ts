import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.account.findMany({
    include: { categories: true },
    orderBy: { code: 'asc' },
  })
  return NextResponse.json(accounts)
}

export async function POST(req: Request) {
  const body = await req.json()
  const account = await prisma.account.create({ data: body })
  return NextResponse.json(account, { status: 201 })
}
