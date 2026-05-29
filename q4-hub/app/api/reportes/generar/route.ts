export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import React, { type JSXElementConstructor, type ReactElement } from 'react'
import { ReportPDF, type ReportColumn, type ReportData } from '@/components/reportes/ReportPDF'
import type { Prisma } from '@prisma/client'

type Tipo = 'transacciones' | 'proyecciones' | 'ceco'
type Formato = 'pdf' | 'excel'

function buildWhere(sp: URLSearchParams, defaults: Prisma.TransactionWhereInput = {}): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { ...defaults }
  const status = sp.get('status')
  const movementType = sp.get('movementType')
  const companyId = sp.get('companyId')
  const costCenterId = sp.get('costCenterId')
  const accountId = sp.get('accountId')
  const from = sp.get('from')
  const to = sp.get('to')
  const q = sp.get('q')

  if (status) where.status = status as 'PAGADO' | 'PENDIENTE' | 'NULO'
  if (movementType) where.movementType = movementType as 'INGRESO' | 'EGRESO'
  if (companyId) where.companyId = Number(companyId)
  if (costCenterId) where.costCenterId = Number(costCenterId)
  if (accountId) where.accountId = Number(accountId)
  if (from || to) {
    where.paymentDate = {
      ...(from ? { gte: new Date(from + 'T00:00:00') } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    }
  }
  if (q) where.OR = [
    { description: { contains: q, mode: 'insensitive' } },
    { facturaNum: { contains: q, mode: 'insensitive' } },
    { boletaNum: { contains: q, mode: 'insensitive' } },
  ]
  return where
}

async function buildReportData(tipo: Tipo, sp: URLSearchParams): Promise<ReportData> {
  const today = new Date().toISOString().slice(0, 10)

  if (tipo === 'transacciones') {
    const where = buildWhere(sp)
    const [rows, agg, byStatus] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: {
          id: true, paymentDate: true, description: true, net: true, gross: true,
          status: true, movementType: true, facturaNum: true, boletaNum: true,
          company: { select: { name: true } },
          costCenter: { select: { code: true } },
          account: { select: { code: true } },
          provider: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
        take: 5000,
      }),
      prisma.transaction.aggregate({ where, _sum: { net: true, gross: true } }),
      prisma.transaction.groupBy({
        by: ['status'], where, _sum: { gross: true }, _count: { _all: true },
      }),
    ])

    const totalGross = Number(agg._sum.gross ?? 0)
    const totalNet = Number(agg._sum.net ?? 0)
    const pagado = Number(byStatus.find(s => s.status === 'PAGADO')?._sum.gross ?? 0)
    const pendiente = Number(byStatus.find(s => s.status === 'PENDIENTE')?._sum.gross ?? 0)

    const columns: ReportColumn[] = [
      { key: 'fecha', label: 'Fecha', flex: 0.7, format: 'date' },
      { key: 'empresa', label: 'Empresa', flex: 0.7 },
      { key: 'ceco', label: 'CeCo', flex: 0.6 },
      { key: 'descripcion', label: 'Descripción', flex: 2.5 },
      { key: 'proveedor', label: 'Proveedor', flex: 1.5 },
      { key: 'cuenta', label: 'Cta', flex: 0.5 },
      { key: 'tipo', label: 'Tipo', flex: 0.5 },
      { key: 'neto', label: 'Neto', flex: 0.9, align: 'right', format: 'money' },
      { key: 'bruto', label: 'Bruto', flex: 0.9, align: 'right', format: 'money' },
      { key: 'estado', label: 'Estado', flex: 0.6 },
    ]

    return {
      title: 'Reporte de Transacciones',
      subtitle: `${rows.length} registros · ${describeFilters(sp)}`,
      kpis: [
        { label: 'Total Neto', value: '$ ' + Math.round(totalNet).toLocaleString('es-CL') },
        { label: 'Total Bruto', value: '$ ' + Math.round(totalGross).toLocaleString('es-CL') },
        { label: 'Pagado', value: '$ ' + Math.round(pagado).toLocaleString('es-CL') },
        { label: 'Pendiente', value: '$ ' + Math.round(pendiente).toLocaleString('es-CL') },
      ],
      columns,
      rows: rows.map(r => ({
        fecha: r.paymentDate?.toISOString() ?? null,
        empresa: r.company.name.split(' ')[0],
        ceco: r.costCenter?.code ?? '—',
        descripcion: r.description,
        proveedor: r.provider?.name ?? '—',
        cuenta: r.account?.code ?? '—',
        tipo: r.movementType,
        neto: Number(r.net),
        bruto: Number(r.gross),
        estado: r.status,
      })),
      meta: `Q4 Hub · Generado ${today}`,
    }
  }

  if (tipo === 'proyecciones') {
    const where = buildWhere(sp, { movementType: 'EGRESO' })
    const rows = await prisma.transaction.findMany({
      where,
      select: {
        id: true, paymentDate: true, description: true, gross: true, status: true,
        company: { select: { name: true } },
        costCenter: { select: { code: true } },
        provider: { select: { name: true } },
        bank: true,
      },
      orderBy: [{ paymentDate: 'asc' }, { gross: 'desc' }],
      take: 5000,
    })

    const total = rows.reduce((s, r) => s + Number(r.gross), 0)
    const pendiente = rows.filter(r => r.status === 'PENDIENTE').reduce((s, r) => s + Number(r.gross), 0)
    const pagado = rows.filter(r => r.status === 'PAGADO').reduce((s, r) => s + Number(r.gross), 0)

    return {
      title: 'Reporte de Proyecciones (Egresos)',
      subtitle: `${rows.length} egresos · ${describeFilters(sp)}`,
      kpis: [
        { label: 'Total', value: '$ ' + Math.round(total).toLocaleString('es-CL') },
        { label: 'Pendiente', value: '$ ' + Math.round(pendiente).toLocaleString('es-CL') },
        { label: 'Pagado', value: '$ ' + Math.round(pagado).toLocaleString('es-CL') },
      ],
      columns: [
        { key: 'fecha', label: 'Fecha', flex: 0.7, format: 'date' },
        { key: 'empresa', label: 'Empresa', flex: 0.7 },
        { key: 'ceco', label: 'CeCo', flex: 0.6 },
        { key: 'descripcion', label: 'Descripción', flex: 3 },
        { key: 'proveedor', label: 'Proveedor', flex: 1.4 },
        { key: 'banco', label: 'Banco', flex: 0.6 },
        { key: 'bruto', label: 'Bruto', flex: 1, align: 'right', format: 'money' },
        { key: 'estado', label: 'Estado', flex: 0.6 },
      ],
      rows: rows.map(r => ({
        fecha: r.paymentDate?.toISOString() ?? null,
        empresa: r.company.name.split(' ')[0],
        ceco: r.costCenter?.code ?? '—',
        descripcion: r.description,
        proveedor: r.provider?.name ?? '—',
        banco: r.bank ?? '—',
        bruto: Number(r.gross),
        estado: r.status,
      })),
      meta: `Q4 Hub · Generado ${today}`,
    }
  }

  // CeCo
  const cecoId = Number(sp.get('cecoId'))
  if (!Number.isFinite(cecoId)) throw new Error('cecoId requerido')
  const ceco = await prisma.costCenter.findUnique({
    where: { id: cecoId },
    include: { company: { select: { name: true } } },
  })
  if (!ceco) throw new Error('CeCo no encontrado')

  const where = { costCenterId: cecoId }
  const [rows, byMovement, byStatus] = await Promise.all([
    prisma.transaction.findMany({
      where,
      select: {
        paymentDate: true, description: true, net: true, gross: true, status: true,
        movementType: true, facturaNum: true,
        provider: { select: { name: true } },
        account: { select: { code: true, name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
    }),
    prisma.transaction.groupBy({
      by: ['movementType'], where: { ...where, status: { not: 'NULO' } },
      _sum: { net: true, gross: true },
    }),
    prisma.transaction.groupBy({
      by: ['status'], where, _sum: { gross: true }, _count: { _all: true },
    }),
  ])
  const ingresos = Number(byMovement.find(m => m.movementType === 'INGRESO')?._sum.net ?? 0)
  const egresos = Number(byMovement.find(m => m.movementType === 'EGRESO')?._sum.net ?? 0)
  const pagado = Number(byStatus.find(s => s.status === 'PAGADO')?._sum.gross ?? 0)
  const pendiente = Number(byStatus.find(s => s.status === 'PENDIENTE')?._sum.gross ?? 0)

  return {
    title: `Reporte CeCo · ${ceco.code} - ${ceco.name}`,
    subtitle: `Empresa: ${ceco.company.name}${ceco.location ? ` · ${ceco.location}` : ''}`,
    kpis: [
      { label: 'Ingresos', value: '$ ' + Math.round(ingresos).toLocaleString('es-CL') },
      { label: 'Egresos', value: '$ ' + Math.round(egresos).toLocaleString('es-CL') },
      { label: 'Balance', value: '$ ' + Math.round(ingresos - egresos).toLocaleString('es-CL') },
      { label: 'Pagado', value: '$ ' + Math.round(pagado).toLocaleString('es-CL') },
      { label: 'Pendiente', value: '$ ' + Math.round(pendiente).toLocaleString('es-CL') },
    ],
    columns: [
      { key: 'fecha', label: 'Fecha', flex: 0.7, format: 'date' },
      { key: 'tipo', label: 'Tipo', flex: 0.5 },
      { key: 'descripcion', label: 'Descripción', flex: 3 },
      { key: 'proveedor', label: 'Proveedor', flex: 1.5 },
      { key: 'cuenta', label: 'Cuenta', flex: 1 },
      { key: 'categoria', label: 'Categoría', flex: 1 },
      { key: 'neto', label: 'Neto', flex: 0.9, align: 'right', format: 'money' },
      { key: 'estado', label: 'Estado', flex: 0.6 },
    ],
    rows: rows.map(r => ({
      fecha: r.paymentDate?.toISOString() ?? null,
      tipo: r.movementType,
      descripcion: r.description,
      proveedor: r.provider?.name ?? '—',
      cuenta: r.account ? `${r.account.code} ${r.account.name}` : '—',
      categoria: r.category?.name ?? '—',
      neto: Number(r.net),
      estado: r.status,
    })),
    meta: `Q4 Hub · ${ceco.code} · Generado ${today}`,
  }
}

function describeFilters(sp: URLSearchParams): string {
  const parts: string[] = []
  if (sp.get('from')) parts.push(`desde ${sp.get('from')}`)
  if (sp.get('to')) parts.push(`hasta ${sp.get('to')}`)
  if (sp.get('status')) parts.push(`${sp.get('status')}`)
  if (sp.get('movementType')) parts.push(`${sp.get('movementType')}`)
  if (parts.length === 0) return 'sin filtros'
  return parts.join(' · ')
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tipo = (searchParams.get('tipo') ?? 'transacciones') as Tipo
  const formato = (searchParams.get('formato') ?? 'pdf') as Formato

  try {
    const data = await buildReportData(tipo, searchParams)

    if (formato === 'excel') {
      const wb = XLSX.utils.book_new()
      if (data.kpis) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.kpis), 'Resumen')
      }
      const sheetRows = data.rows.map(r => {
        const out: Record<string, unknown> = {}
        for (const c of data.columns) {
          const v = r[c.key]
          if (c.format === 'date' && v) {
            out[c.label] = new Date(v as string).toISOString().slice(0, 10)
          } else {
            out[c.label] = v ?? ''
          }
        }
        return out
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetRows), 'Datos')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${sanitize(data.title)}.xlsx"`,
        },
      })
    }

    // PDF
    const element = React.createElement(ReportPDF, { data }) as unknown as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>
    const buffer = await renderToBuffer(element)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${sanitize(data.title)}.pdf"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error generando reporte'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9_\-]+/gi, '_').slice(0, 80)
}
