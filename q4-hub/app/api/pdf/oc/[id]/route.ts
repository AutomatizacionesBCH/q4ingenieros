import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { OrdenCompraPDF, type OCPDFData } from '@/components/pdf/OrdenCompraPDF'
import React, { type JSXElementConstructor, type ReactElement } from 'react'
import fs from 'fs'
import path from 'path'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const oc = await prisma.purchaseOrder.findUnique({
    where: { id: Number(id) },
    include: {
      company: { select: { name: true, rut: true } },
      costCenter: { select: { code: true, name: true } },
      provider: {
        select: {
          name: true, rut: true, email: true, phone: true,
          address: true, city: true, contactName: true,
        },
      },
    },
  })

  if (!oc) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  // Cargar logo como base64
  let logoBase64: string | undefined
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.jpeg')
    logoBase64 = fs.readFileSync(logoPath).toString('base64')
  } catch {
    // Sin logo si no existe el archivo
  }

  const data: OCPDFData = {
    id: oc.id,
    createdAt: oc.createdAt.toISOString(),
    description: oc.description,
    total: Number(oc.total),
    retencion: oc.retencion ? Number(oc.retencion) : null,
    projectNumber: oc.projectNumber,
    solicitadoPor: oc.solicitadoPor,
    gerencia: oc.gerencia,
    cotizacionNum: oc.cotizacionNum,
    condicionPago: oc.condicionPago,
    tipoMoneda: oc.tipoMoneda,
    status: oc.status,
    company: oc.company,
    costCenter: oc.costCenter,
    provider: oc.provider,
    logoBase64,
  }

  const element = React.createElement(OrdenCompraPDF, { oc: data }) as unknown as ReactElement<
    DocumentProps, string | JSXElementConstructor<unknown>
  >

  const buffer = await renderToBuffer(element)

  const correlativo = String(oc.id).padStart(4, '0')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="OC-${correlativo}.pdf"`,
    },
  })
}
