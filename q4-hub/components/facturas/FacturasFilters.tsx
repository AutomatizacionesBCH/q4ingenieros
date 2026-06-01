'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCLP, formatDate } from '@/lib/fmt'
import { MarcarRecibidaButton } from './MarcarRecibidaButton'

export type FacturaRow = {
  id: number
  invoiceNumber: string | null
  epNumber: string | null
  issueDate: string | null
  paymentDate: string | null
  amount: number
  received: number
  status: string
  factoring: boolean
  companyId: number
  costCenterId: number | null
  company: { name: string }
  costCenter: { code: string; name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  PAGADO: '#16A34A',
  PENDIENTE: '#CA8A04',
  NULO: '#94A3B8',
}

const INPUT_STYLE: React.CSSProperties = {
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '7px 11px',
  fontSize: 13,
  color: '#0F1A2E',
  outline: 'none',
  height: 34,
  boxSizing: 'border-box',
}

export function FacturasFilters({ facturas }: { facturas: FacturaRow[] }) {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [costCenterId, setCostCenterId] = useState('')

  const companies = useMemo(() => {
    const map = new Map<number, string>()
    facturas.forEach(f => map.set(f.companyId, f.company.name))
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [facturas])

  const costCenters = useMemo(() => {
    const map = new Map<number, { code: string; name: string }>()
    facturas.forEach(f => {
      if (f.costCenterId && f.costCenter) map.set(f.costCenterId, f.costCenter)
    })
    return Array.from(map.entries())
      .map(([id, cc]) => ({ id, ...cc }))
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [facturas])

  const hasCeCo = costCenters.length > 0

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return facturas.filter(f => {
      if (q) {
        const haystack = [f.invoiceNumber, f.epNumber, f.company.name, f.costCenter?.code, f.costCenter?.name]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (companyId && f.companyId !== Number(companyId)) return false
      if (costCenterId && f.costCenterId !== Number(costCenterId)) return false
      if (dateFrom && f.issueDate) {
        if (f.issueDate.slice(0, 10) < dateFrom) return false
      }
      if (dateTo && f.issueDate) {
        if (f.issueDate.slice(0, 10) > dateTo) return false
      }
      return true
    })
  }, [facturas, search, dateFrom, dateTo, companyId, costCenterId])

  const totalMonto = filtered.reduce((s, f) => s + f.amount, 0)
  const totalRecibido = filtered.reduce((s, f) => s + f.received, 0)
  const totalPendiente = totalMonto - totalRecibido

  const hasFilters = search || dateFrom || dateTo || companyId || costCenterId

  function clearFilters() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setCompanyId('')
    setCostCenterId('')
  }

  return (
    <>
      {/* Barra de filtros */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}>
        {/* Buscador */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: '#94A3B8', fontSize: 14, pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar N° factura, EP, empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...INPUT_STYLE, paddingLeft: 30, width: '100%' }}
          />
        </div>

        {/* Desde */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>Desde</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{ ...INPUT_STYLE, width: 140 }}
          />
        </div>

        {/* Hasta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>Hasta</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{ ...INPUT_STYLE, width: 140 }}
          />
        </div>

        {/* Empresa */}
        <select
          value={companyId}
          onChange={e => setCompanyId(e.target.value)}
          style={{ ...INPUT_STYLE, flex: '0 1 180px', minWidth: 150, cursor: 'pointer' }}
        >
          <option value="">Todas las empresas</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* CeCo — solo si hay centros de costo */}
        {hasCeCo && (
          <select
            value={costCenterId}
            onChange={e => setCostCenterId(e.target.value)}
            style={{ ...INPUT_STYLE, flex: '0 1 180px', minWidth: 150, cursor: 'pointer' }}
          >
            <option value="">Todos los CeCo</option>
            {costCenters.map(cc => (
              <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
            ))}
          </select>
        )}

        {/* Limpiar filtros */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              background: 'transparent',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              color: '#64748B',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              height: 34,
            }}
          >
            ✕ Limpiar
          </button>
        )}

        {/* Contador */}
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {filtered.length === facturas.length
            ? `${facturas.length} facturas`
            : `${filtered.length} de ${facturas.length}`}
        </span>
      </div>

      {/* KPIs — reflejan el filtro activo */}
      <div className="q4-kpi-grid q4-kpi-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total facturado', value: formatCLP(totalMonto), color: '#0F1A2E' },
          { label: 'Total recibido', value: formatCLP(totalRecibido), color: '#16A34A' },
          { label: 'Pendiente cobro', value: formatCLP(totalPendiente), color: '#CA8A04' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#FFFFFF', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px',
          }}>
            <div style={{
              color: '#94A3B8', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
            }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Emisión', 'N° EP', 'N° Factura', 'Empresa', 'CeCo', 'Monto', 'Recibido', 'Estado', 'Acción'].map(h => (
                <th key={h} style={{
                  padding: '12px 14px',
                  textAlign: ['Monto', 'Recibido'].includes(h) ? 'right' : 'left',
                  color: '#94A3B8', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => {
              const pendiente = f.amount - f.received
              return (
                <tr key={f.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : '#F8FAFC',
                }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                    <Link href={`/facturas-emitidas/${f.id}/editar`} style={{ color: '#E5501E', textDecoration: 'none' }}>
                      {formatDate(f.issueDate)}
                    </Link>
                  </td>
                  <td style={{ padding: '9px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}>
                    {f.epNumber ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', color: '#0F1A2E', fontSize: 13 }}>
                    {f.invoiceNumber ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', color: '#475569', fontSize: 12 }}>
                    {f.company.name.split(' ')[0]}
                  </td>
                  <td style={{ padding: '9px 14px', color: '#E5501E', fontSize: 12, fontFamily: 'monospace' }}>
                    {f.costCenter?.code ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#0F1A2E', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCLP(f.amount)}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: pendiente <= 0 ? '#16A34A' : '#CA8A04' }}>
                    {formatCLP(f.received)}
                    {pendiente > 0 && (
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>falta {formatCLP(pendiente)}</div>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      background: STATUS_COLORS[f.status] + '22',
                      color: STATUS_COLORS[f.status],
                      borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                    }}>{f.status}</span>
                    {f.factoring && (
                      <span style={{
                        background: 'rgba(229,80,30,0.15)', color: '#E5501E',
                        borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, marginLeft: 4,
                      }}>FACT</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                    {f.status !== 'PAGADO' && (
                      <MarcarRecibidaButton id={f.id} amount={f.amount} />
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '32px 14px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  {hasFilters ? 'Sin resultados para los filtros aplicados' : 'Sin facturas emitidas — usa "+ Nueva factura" arriba'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
