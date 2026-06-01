export const revalidate = 0

import { Suspense } from 'react'
import { T } from '@/lib/theme'
import { getCompanies } from '@/lib/maestros-cache'
import {
  monthBounds, getSaldoDisponible, getPeriodTotals,
  getProjectedFlow, accumulateProjection, getPagosSemana, getEvolucionSemanal, getEvolucionMensual,
  getDesglosePorEmpresa,
} from '@/lib/dashboard-data'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { SaldoKpiStrip } from '@/components/dashboard/SaldoKpiStrip'
import { ProyeccionFlujoChart } from '@/components/dashboard/ProyeccionFlujoChart'
import { AlertaFlujoPanel } from '@/components/dashboard/AlertaFlujoPanel'
import { EvolucionSemanalChart } from '@/components/dashboard/EvolucionSemanalChart'
import { EvolucionMensualChart } from '@/components/dashboard/EvolucionMensualChart'
import { DesgloseEmpresaTable } from '@/components/dashboard/DesgloseEmpresaTable'
import { PagosProximosWidget } from '@/components/dashboard/PagosProximosWidget'

type SP = { companyId?: string; month?: string; status?: string }

async function FiltrosWrapper() {
  const companies = await getCompanies()
  return <DashboardFilters companies={companies.map(c => ({ id: c.id, label: c.name }))} />
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const companyId = sp.companyId ? Number(sp.companyId) : undefined
  const status = sp.status || undefined
  const mb = monthBounds(sp.month)

  // All queries run in parallel; the projection's running balance is layered on after.
  const [saldoInfo, curr, prev, proj, pagos, evoSemanal, evoMensual, desglose] = await Promise.all([
    getSaldoDisponible(companyId),
    getPeriodTotals(mb.start, mb.end, companyId, status),
    getPeriodTotals(mb.prevStart, mb.prevEnd, companyId, status),
    getProjectedFlow(companyId),
    getPagosSemana(companyId),
    getEvolucionSemanal(companyId, status),
    getEvolucionMensual(companyId, status),
    getDesglosePorEmpresa(mb.start, mb.end, status),
  ])

  const projected = accumulateProjection(saldoInfo.saldo, proj.rawWeeks)
  const saldoRegistrado = saldoInfo.saldoFecha !== null
  const selectedCompany = companyId ? desglose.rows.find(r => r.companyId === companyId) : null
  const scopeLabel = selectedCompany ? selectedCompany.name : 'Grupo consolidado'

  return (
    <div className="q4-page" style={{ padding: 28 }}>
      <div className="q4-content">
        {/* Header */}
        <div className="q4-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="q4-h1" style={{ color: T.textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
            <div style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
              {mb.label} · {scopeLabel}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Suspense fallback={<div style={{ height: 75, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 18 }} />}>
          <FiltrosWrapper />
        </Suspense>

        {/* HERO: flujo proyectado + alerta */}
        <div className="q4-dash-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
          <ProyeccionFlujoChart data={projected.weeks} />
          <AlertaFlujoPanel
            projected={projected.weeks}
            saldoActual={saldoInfo.saldo}
            saldoRegistrado={saldoRegistrado}
            unscheduledEgresoCount={proj.unscheduledEgresoCount}
          />
        </div>

        {/* KPI strip */}
        <SaldoKpiStrip
          saldo={saldoInfo.saldo}
          saldoFecha={saldoInfo.saldoFecha}
          curr={curr}
          prev={prev}
        />

        {/* Pagos semana + evolución semanal */}
        <div className="q4-dash-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, margin: '20px 0' }}>
          <PagosProximosWidget
            pagos={pagos.pagos}
            title="Pagos pendientes · semana en curso"
            total={pagos.total}
            emptyLabel="Sin pagos pendientes esta semana ✓"
            unscheduledCount={proj.unscheduledEgresoCount}
          />
          <EvolucionSemanalChart data={evoSemanal} />
        </div>

        {/* Evolución mensual + desglose por empresa */}
        <div className="q4-dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <EvolucionMensualChart data={evoMensual} highlightMonth={mb.key} />
          <DesgloseEmpresaTable
            rows={desglose.rows}
            grupo={desglose.grupo}
            singleCompany={companyId}
            currentParams={{ month: sp.month, status: sp.status }}
          />
        </div>
      </div>
    </div>
  )
}
