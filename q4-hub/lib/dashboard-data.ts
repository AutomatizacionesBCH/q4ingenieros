/**
 * Server-only data layer for the consolidated dashboard.
 * Pure query + aggregation helpers — no JSX. Every function is companyId-driven
 * (absent = Grupo consolidado) and returns plain serializable types
 * (Decimal → Number, Date → ISO string) ready to cross the client boundary.
 *
 * Conventions:
 *  - NULO is always excluded from money aggregates unless explicitly filtered.
 *  - Month/period bounds are UTC half-open [start, end) to match @db.Date columns.
 *  - P&L / evolution / comparativa use NET; cash-out (pagos, projection) uses GROSS.
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const MESES_LARGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Status filter (Prisma where): explicit estado match, else exclude NULO. */
function statusWhere(status?: string): Prisma.TransactionWhereInput['status'] {
  if (status === 'PAGADO' || status === 'PENDIENTE' || status === 'NULO') return status
  return { not: 'NULO' }
}

/** Status filter (raw SQL fragment): explicit estado match, else exclude NULO. */
function statusSql(status?: string) {
  if (status === 'PAGADO' || status === 'PENDIENTE' || status === 'NULO') {
    return Prisma.sql`AND "status"::text = ${status}`
  }
  return Prisma.sql`AND "status"::text <> 'NULO'`
}

/** Optional companyId raw SQL fragment. */
function companySql(companyId?: number) {
  return companyId ? Prisma.sql`AND "companyId" = ${companyId}` : Prisma.empty
}

function ddmm(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Current ISO week, anchored in UTC to match @db.Date columns (paymentDate is stored
 * at UTC midnight). Building boundaries in local time would skew every Monday by the
 * server TZ offset and drop/misbucket transactions on a UTC-4 deploy.
 *  - monday   : UTC midnight of this week's Monday
 *  - friday   : UTC midnight of this week's Friday (display only)
 *  - saturday : UTC midnight of Saturday = exclusive end of the Mon–Fri window
 */
export function getWeekRange() {
  const now = new Date()
  const dow = now.getUTCDay() // 0=Sun … 6=Sat
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  const friday = new Date(monday)
  friday.setUTCDate(monday.getUTCDate() + 4)
  const saturday = new Date(monday)
  saturday.setUTCDate(monday.getUTCDate() + 5)
  return { monday, friday, saturday }
}

/** UTC half-open bounds for a YYYY-MM month (default: current month) + previous-month bounds. */
export function monthBounds(month?: string) {
  const now = new Date()
  let y: number
  let m: number // 1–12
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [yy, mm] = month.split('-').map(Number)
    y = yy
    m = mm
  } else {
    y = now.getUTCFullYear()
    m = now.getUTCMonth() + 1
  }
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  const prevStart = new Date(Date.UTC(y, m - 2, 1))
  const prevEnd = start
  const key = `${y}-${String(m).padStart(2, '0')}`
  return { start, end, prevStart, prevEnd, label: `${MESES_LARGO[m - 1]} ${y}`, key, y, m }
}

/** Real-time saldo disponible = sum of latest CONTABLE BankBalance per (bank, company). */
export async function getSaldoDisponible(companyId?: number) {
  const balances = await prisma.bankBalance.findMany({
    where: { type: 'CONTABLE', ...(companyId ? { companyId } : {}) },
    select: { bank: true, companyId: true, balance: true, recordedAt: true },
    orderBy: { recordedAt: 'desc' },
    take: 400,
  })
  const latest = new Map<string, (typeof balances)[number]>()
  for (const b of balances) {
    const k = `${b.bank}|${b.companyId}`
    if (!latest.has(k)) latest.set(k, b)
  }
  let saldo = 0
  let saldoFecha: Date | null = null
  for (const b of latest.values()) {
    saldo += Number(b.balance)
    if (!saldoFecha || b.recordedAt > saldoFecha) saldoFecha = b.recordedAt
  }
  return { saldo, saldoFecha: saldoFecha ? saldoFecha.toISOString() : null }
}

type Totals = { ingresos: number; egresos: number; resultado: number }

/** Period P&L (NET) for [start, end), companyId + estado-scoped, NULO excluded by default. */
export async function getPeriodTotals(
  start: Date, end: Date, companyId?: number, status?: string,
): Promise<Totals> {
  const grouped = await prisma.transaction.groupBy({
    by: ['movementType'],
    where: {
      paymentDate: { gte: start, lt: end },
      status: statusWhere(status),
      ...(companyId ? { companyId } : {}),
    },
    _sum: { net: true },
  })
  const ingresos = Number(grouped.find(g => g.movementType === 'INGRESO')?._sum.net ?? 0)
  const egresos = Number(grouped.find(g => g.movementType === 'EGRESO')?._sum.net ?? 0)
  return { ingresos, egresos, resultado: ingresos - egresos }
}

export type ProjectedRawWeek = { weekLabel: string; weekStartISO: string; ingreso: number; egreso: number }
export type ProjectedWeek = ProjectedRawWeek & { running: number }

/**
 * Forward cash-flow buckets over `weeks` ISO weeks from this week's Monday, aggregated
 * in the DB (date_trunc('week')) so we transfer ~8 rows instead of thousands. PENDIENTE
 * only, GROSS, forward from today (ignores month/estado by design). Pure query — the
 * running balance is layered on afterwards via accumulateProjection(saldo, …).
 */
export async function getProjectedFlow(companyId?: number, weeks = 8) {
  const { monday } = getWeekRange()
  const firstMonday = new Date(monday) // UTC midnight
  const weekEnd = new Date(firstMonday)
  weekEnd.setUTCDate(firstMonday.getUTCDate() + weeks * 7)

  const [rows, unscheduledEgresoCount] = await Promise.all([
    prisma.$queryRaw<{ wk: Date; ingreso: number; egreso: number }[]>(Prisma.sql`
      SELECT date_trunc('week', "paymentDate")::date AS wk,
             SUM(CASE WHEN "movementType" = 'INGRESO' THEN "gross" ELSE 0 END)::float8 AS ingreso,
             SUM(CASE WHEN "movementType" = 'EGRESO'  THEN "gross" ELSE 0 END)::float8 AS egreso
      FROM "Transaction"
      WHERE "status" = 'PENDIENTE'
        AND "paymentDate" >= ${firstMonday} AND "paymentDate" < ${weekEnd}
        ${companySql(companyId)}
      GROUP BY 1
    `),
    prisma.transaction.count({
      where: {
        status: 'PENDIENTE', movementType: 'EGRESO', paymentDate: null,
        ...(companyId ? { companyId } : {}),
      },
    }),
  ])

  const map = new Map<string, { ingreso: number; egreso: number }>()
  for (const r of rows) {
    const d = r.wk instanceof Date ? r.wk : new Date(r.wk)
    map.set(d.toISOString().slice(0, 10), { ingreso: Number(r.ingreso), egreso: Number(r.egreso) })
  }
  const rawWeeks: ProjectedRawWeek[] = []
  for (let k = 0; k < weeks; k++) {
    const ws = new Date(firstMonday)
    ws.setUTCDate(firstMonday.getUTCDate() + k * 7)
    const hit = map.get(ws.toISOString().slice(0, 10)) ?? { ingreso: 0, egreso: 0 }
    rawWeeks.push({ weekLabel: ddmm(ws), weekStartISO: ws.toISOString(), ingreso: hit.ingreso, egreso: hit.egreso })
  }
  return { rawWeeks, unscheduledEgresoCount }
}

/** Layer the running balance (starting from saldoActual) onto the projection buckets. */
export function accumulateProjection(saldoActual: number, rawWeeks: ProjectedRawWeek[]) {
  let running = saldoActual
  const weeks: ProjectedWeek[] = rawWeeks.map(w => {
    running += w.ingreso - w.egreso
    return { ...w, running }
  })
  const minRunning = weeks.reduce((m, w) => Math.min(m, w.running), Number.POSITIVE_INFINITY)
  return { weeks, minRunning }
}

export type PagoSemana = {
  id: number
  description: string
  gross: number
  paymentDate: string | null
  costCenter: string | null
  provider: string | null
}

/** PENDIENTE EGRESO due Mon–Fri of the current week (GROSS cash-out). */
export async function getPagosSemana(companyId?: number) {
  const { monday, friday, saturday } = getWeekRange()
  const rows = await prisma.transaction.findMany({
    where: {
      status: 'PENDIENTE', movementType: 'EGRESO',
      paymentDate: { gte: monday, lt: saturday },
      ...(companyId ? { companyId } : {}),
    },
    select: {
      id: true, description: true, gross: true, paymentDate: true,
      costCenter: { select: { code: true } },
      provider: { select: { name: true } },
    },
    orderBy: { paymentDate: 'asc' },
  })
  const pagos: PagoSemana[] = rows.map(p => ({
    id: p.id,
    description: p.description,
    gross: Number(p.gross),
    paymentDate: p.paymentDate?.toISOString() ?? null,
    costCenter: p.costCenter?.code ?? null,
    provider: p.provider?.name ?? null,
  }))
  const total = pagos.reduce((s, p) => s + p.gross, 0)
  return { pagos, monday: monday.toISOString(), friday: friday.toISOString(), total }
}

export type EvolucionWeek = { week: string; ingresos: number; egresos: number }

/** Last 8 ISO weeks ingresos vs egresos (NET), ending with the current week. DB-aggregated. */
export async function getEvolucionSemanal(companyId?: number, status?: string): Promise<EvolucionWeek[]> {
  const { monday } = getWeekRange()
  const start = new Date(monday)
  start.setUTCDate(monday.getUTCDate() - 7 * 7) // 7 weeks back → 8 buckets incl. current
  const end = new Date(monday)
  end.setUTCDate(monday.getUTCDate() + 7)

  const rows = await prisma.$queryRaw<{ wk: Date; ingresos: number; egresos: number }[]>(Prisma.sql`
    SELECT date_trunc('week', "paymentDate")::date AS wk,
           SUM(CASE WHEN "movementType" = 'INGRESO' THEN "net" ELSE 0 END)::float8 AS ingresos,
           SUM(CASE WHEN "movementType" = 'EGRESO'  THEN "net" ELSE 0 END)::float8 AS egresos
    FROM "Transaction"
    WHERE "paymentDate" >= ${start} AND "paymentDate" < ${end}
      ${statusSql(status)}
      ${companySql(companyId)}
    GROUP BY 1
  `)
  const map = new Map<string, { ingresos: number; egresos: number }>()
  for (const r of rows) {
    const d = r.wk instanceof Date ? r.wk : new Date(r.wk)
    map.set(d.toISOString().slice(0, 10), { ingresos: Number(r.ingresos), egresos: Number(r.egresos) })
  }
  const out: EvolucionWeek[] = []
  for (let k = 0; k < 8; k++) {
    const ws = new Date(start)
    ws.setUTCDate(start.getUTCDate() + k * 7)
    const hit = map.get(ws.toISOString().slice(0, 10))
    out.push({ week: ddmm(ws), ingresos: hit?.ingresos ?? 0, egresos: hit?.egresos ?? 0 })
  }
  return out
}

export type EvolucionMonth = { month: string; key: string; ingresos: number; egresos: number }

/** Rolling 12 months ingresos vs egresos (NET). `key` is YYYY-MM for highlight matching. DB-aggregated. */
export async function getEvolucionMensual(companyId?: number, status?: string): Promise<EvolucionMonth[]> {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  const rows = await prisma.$queryRaw<{ key: string; ingresos: number; egresos: number }[]>(Prisma.sql`
    SELECT to_char(date_trunc('month', "paymentDate"), 'YYYY-MM') AS key,
           SUM(CASE WHEN "movementType" = 'INGRESO' THEN "net" ELSE 0 END)::float8 AS ingresos,
           SUM(CASE WHEN "movementType" = 'EGRESO'  THEN "net" ELSE 0 END)::float8 AS egresos
    FROM "Transaction"
    WHERE "paymentDate" >= ${start} AND "paymentDate" < ${end}
      ${statusSql(status)}
      ${companySql(companyId)}
    GROUP BY 1
  `)
  const map = new Map(rows.map(r => [r.key, r]))

  const buckets: EvolucionMonth[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const hit = map.get(key)
    buckets.push({
      month: MESES_CORTO[d.getUTCMonth()], key,
      ingresos: hit ? Number(hit.ingresos) : 0,
      egresos: hit ? Number(hit.egresos) : 0,
    })
  }
  return buckets
}

export type EmpresaRow = {
  companyId: number
  name: string
  type: 'PRINCIPAL' | 'TRANSVERSAL'
  splitRatio: number
  saldo: number
  ingresos: number
  egresos: number
  resultado: number
}

/** Per-company breakdown for the period (NET) + real-time saldo, plus the GRUPO total. */
export async function getDesglosePorEmpresa(start: Date, end: Date, status?: string) {
  const [companies, grouped, balances] = await Promise.all([
    prisma.company.findMany({
      select: { id: true, name: true, type: true, splitRatio: true },
      orderBy: { name: 'asc' },
    }),
    prisma.transaction.groupBy({
      by: ['companyId', 'movementType'],
      where: { paymentDate: { gte: start, lt: end }, status: statusWhere(status) },
      _sum: { net: true },
    }),
    prisma.bankBalance.findMany({
      where: { type: 'CONTABLE' },
      select: { bank: true, companyId: true, balance: true, recordedAt: true },
      orderBy: { recordedAt: 'desc' },
      take: 800,
    }),
  ])

  const latest = new Map<string, (typeof balances)[number]>()
  for (const b of balances) {
    const k = `${b.bank}|${b.companyId}`
    if (!latest.has(k)) latest.set(k, b)
  }
  const saldoByCompany = new Map<number, number>()
  for (const b of latest.values()) {
    saldoByCompany.set(b.companyId, (saldoByCompany.get(b.companyId) ?? 0) + Number(b.balance))
  }

  const rows: EmpresaRow[] = companies.map(c => {
    const ingresos = Number(grouped.find(g => g.companyId === c.id && g.movementType === 'INGRESO')?._sum.net ?? 0)
    const egresos = Number(grouped.find(g => g.companyId === c.id && g.movementType === 'EGRESO')?._sum.net ?? 0)
    return {
      companyId: c.id,
      name: c.name,
      type: c.type as 'PRINCIPAL' | 'TRANSVERSAL',
      splitRatio: Number(c.splitRatio),
      saldo: saldoByCompany.get(c.id) ?? 0,
      ingresos,
      egresos,
      resultado: ingresos - egresos,
    }
  })
  const grupo = rows.reduce(
    (acc, r) => ({
      saldo: acc.saldo + r.saldo,
      ingresos: acc.ingresos + r.ingresos,
      egresos: acc.egresos + r.egresos,
      resultado: acc.resultado + r.resultado,
    }),
    { saldo: 0, ingresos: 0, egresos: 0, resultado: 0 },
  )
  return { rows, grupo }
}
