import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? Number(yearParam) : new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const [byCompanyMovement, byCompanyMonth, txs, companies] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['companyId', 'movementType'],
      where: { status: { not: 'NULO' }, paymentDate: { gte: yearStart, lt: yearEnd } },
      _sum: { net: true, gross: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ companyId: number; mes: number; movementType: string; total: number }[]>`
      SELECT
        "companyId",
        EXTRACT(MONTH FROM "paymentDate")::int AS mes,
        "movementType"::text AS "movementType",
        SUM(net)::float AS total
      FROM "Transaction"
      WHERE "status" != 'NULO'
        AND "paymentDate" >= ${yearStart}
        AND "paymentDate" < ${yearEnd}
      GROUP BY "companyId", mes, "movementType"
      ORDER BY mes, "companyId"
    `,
    prisma.transaction.findMany({
      where: { paymentDate: { gte: yearStart, lt: yearEnd } },
      include: {
        company: { select: { name: true } },
        costCenter: { select: { code: true, name: true } },
        account: { select: { code: true, name: true } },
        category: { select: { name: true } },
        provider: { select: { name: true } },
      },
      orderBy: { paymentDate: 'asc' },
    }),
    prisma.company.findMany({ select: { id: true, name: true } }),
  ])

  const cmap = new Map(companies.map(c => [c.id, c.name]))

  // ── Hoja 1: Resumen por empresa ─────────────────────────────────────
  const resumenRows = companies.map(c => {
    const ing = byCompanyMovement.find(r => r.companyId === c.id && r.movementType === 'INGRESO')
    const eg = byCompanyMovement.find(r => r.companyId === c.id && r.movementType === 'EGRESO')
    const ingNet = Number(ing?._sum.net ?? 0)
    const egNet = Number(eg?._sum.net ?? 0)
    return {
      Empresa: c.name,
      'Ingresos (neto)': ingNet,
      'Egresos (neto)': egNet,
      'Resultado': ingNet - egNet,
      'Tx Ingreso': ing?._count._all ?? 0,
      'Tx Egreso': eg?._count._all ?? 0,
    }
  })

  // ── Hoja 2: Mensual por empresa ─────────────────────────────────────
  const mensualRows: Record<string, string | number>[] = []
  for (let mes = 1; mes <= 12; mes++) {
    for (const c of companies) {
      const ing = byCompanyMonth.find(r => r.companyId === c.id && r.mes === mes && r.movementType === 'INGRESO')
      const eg = byCompanyMonth.find(r => r.companyId === c.id && r.mes === mes && r.movementType === 'EGRESO')
      mensualRows.push({
        Mes: mes,
        Empresa: c.name,
        Ingresos: Number(ing?.total ?? 0),
        Egresos: Number(eg?.total ?? 0),
        Resultado: Number(ing?.total ?? 0) - Number(eg?.total ?? 0),
      })
    }
  }

  // ── Hoja 3: Transacciones detalle ───────────────────────────────────
  const txRows = txs.map(t => ({
    ID: t.id,
    Fecha: t.paymentDate?.toISOString().slice(0, 10) ?? '',
    Empresa: cmap.get(t.companyId) ?? '',
    Tipo: t.movementType,
    Estado: t.status,
    CeCo: t.costCenter?.code ?? '',
    'CeCo Nombre': t.costCenter?.name ?? '',
    Cuenta: t.account?.code ?? '',
    'Cuenta Nombre': t.account?.name ?? '',
    Categoria: t.category?.name ?? '',
    Proveedor: t.provider?.name ?? '',
    Descripción: t.description,
    Neto: Number(t.net),
    IVA: Number(t.tax),
    Bruto: Number(t.gross),
    Método: t.paymentMethod ?? '',
    Banco: t.bank ?? '',
    'N° Factura': t.facturaNum ?? '',
    'N° Boleta': t.boletaNum ?? '',
    Moneda: t.currency,
  }))

  // ── Build workbook ──────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), 'Resumen YTD')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mensualRows), 'Mensual por empresa')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Transacciones')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Q4Hub_Reporte_${year}.xlsx"`,
    },
  })
}
