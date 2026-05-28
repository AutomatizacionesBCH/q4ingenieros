import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { PropuestaCierrePDF } from '@/components/pdf/PropuestaCierrePDF'
import React, { type JSXElementConstructor, type ReactElement } from 'react'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const propuesta = await prisma.closingProposal.findUnique({
    where: { id: Number(id) },
    include: {
      costCenter: { select: { code: true, name: true } },
      provider: { select: { name: true, rut: true } },
    },
  })
  if (!propuesta) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const element = React.createElement(PropuestaCierrePDF, {
    propuesta: {
      ...propuesta,
      content: propuesta.content as Record<string, unknown>,
      createdAt: propuesta.createdAt.toISOString(),
    },
    empresa: 'Novarso SpA',
  }) as unknown as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

  const buffer = await renderToBuffer(element)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="propuesta-${id}.pdf"`,
    },
  })
}
