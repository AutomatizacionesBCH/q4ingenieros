'use client'
import { useMemo, useState } from 'react'
import { T } from '@/lib/theme'
import { formatCLP, formatDate } from '@/lib/fmt'

type Company = { id: number; label: string }
type Ceco = { id: number; label: string; companyId: number }
type Account = { id: number; label: string; movementType: string }

type ReportColumn = { key: string; label: string; flex?: number; align?: 'right' | 'left'; format?: 'date' | 'money' }
type ReportRow = Record<string, string | number | null>
type ReportData = {
  title: string
  subtitle?: string
  kpis?: { label: string; value: string }[]
  columns: ReportColumn[]
  rows: ReportRow[]
  meta?: string
  totalRows?: number
  truncated?: boolean
}

const inputStyle: React.CSSProperties = {
  background: T.field, border: `1px solid ${T.border}`, borderRadius: 8,
  padding: '9px 12px', color: T.textPrimary, fontSize: 13, outline: 'none', width: '100%',
}
const labelStyle: React.CSSProperties = {
  display: 'block', color: T.textMuted, fontSize: 10, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
}

type Tipo = 'transacciones' | 'proyecciones' | 'ceco'

export function Generador({
  companies, cecos, accounts,
}: { companies: Company[]; cecos: Ceco[]; accounts: Account[] }) {
  const [tipo, setTipo] = useState<Tipo>('transacciones')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [movementType, setMovementType] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [q, setQ] = useState('')
  const [cecoIdSel, setCecoIdSel] = useState('')

  const [preview, setPreview] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // —— Filtros ligados ——
  // CeCo disponibles según la empresa elegida.
  const cecosFiltrados = useMemo(
    () => (companyId ? cecos.filter(c => c.companyId === Number(companyId)) : cecos),
    [companyId, cecos]
  )
  // Cuentas disponibles según el tipo de movimiento elegido.
  const accountsFiltradas = useMemo(
    () => (movementType ? accounts.filter(a => a.movementType === movementType) : accounts),
    [movementType, accounts]
  )

  const onEmpresa = (v: string) => {
    setCompanyId(v)
    // Si el CeCo elegido ya no pertenece a la empresa, lo limpio.
    if (costCenterId && v) {
      const cc = cecos.find(c => c.id === Number(costCenterId))
      if (cc && cc.companyId !== Number(v)) setCostCenterId('')
    }
  }
  const onCeco = (v: string) => {
    setCostCenterId(v)
    // Al elegir un CeCo, ligo la empresa a la del CeCo.
    if (v) {
      const cc = cecos.find(c => c.id === Number(v))
      if (cc) setCompanyId(String(cc.companyId))
    }
  }
  const onMovement = (v: string) => {
    setMovementType(v)
    if (accountId && v) {
      const ac = accounts.find(a => a.id === Number(accountId))
      if (ac && ac.movementType !== v) setAccountId('')
    }
  }

  const buildParams = (formato: 'pdf' | 'excel' | 'json') => {
    const p = new URLSearchParams()
    p.set('tipo', tipo)
    p.set('formato', formato)
    if (tipo === 'ceco') {
      if (!cecoIdSel) return null
      p.set('cecoId', cecoIdSel)
    } else {
      if (from) p.set('from', from)
      if (to) p.set('to', to)
      if (status) p.set('status', status)
      if (movementType) p.set('movementType', movementType)
      if (companyId) p.set('companyId', companyId)
      if (costCenterId) p.set('costCenterId', costCenterId)
      if (accountId) p.set('accountId', accountId)
      if (q) p.set('q', q)
    }
    return p
  }

  const generarPreview = async () => {
    const p = buildParams('json')
    if (!p) { setError('Selecciona un Centro de Costo'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/reportes/generar?${p.toString()}`)
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? `HTTP ${res.status}`)
      }
      setPreview(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando la vista previa')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const exportar = (formato: 'pdf' | 'excel') => {
    const p = buildParams(formato)
    if (!p) { setError('Selecciona un Centro de Costo'); return }
    window.open(`/api/reportes/generar?${p.toString()}`, '_blank')
  }

  const fmtCell = (c: ReportColumn, v: string | number | null) => {
    if (v == null || v === '') return '—'
    if (c.format === 'date') return formatDate(v as string)
    if (c.format === 'money') return formatCLP(Number(v))
    return String(v)
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* —— Panel de filtros —— */}
      <div style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
        padding: 24, boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
      }}>
        <h2 style={{ color: T.textPrimary, fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 18,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Generar reporte</h2>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Tipo de reporte</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { v: 'transacciones', lab: '📋 Transacciones' },
              { v: 'proyecciones', lab: '📅 Proyecciones (egresos)' },
              { v: 'ceco', lab: '🏗 Por CeCo' },
            ] as { v: Tipo; lab: string }[]).map(o => (
              <button key={o.v} onClick={() => { setTipo(o.v); setPreview(null) }} style={{
                flex: '1 1 160px', padding: '12px 16px', borderRadius: 8,
                background: tipo === o.v ? T.orangeFaint : T.card,
                border: `1px solid ${tipo === o.v ? T.orangeBorder : T.border}`,
                color: tipo === o.v ? T.orange : T.textSec,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{o.lab}</button>
            ))}
          </div>
        </div>

        {tipo === 'ceco' ? (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Selecciona el Centro de Costo *</label>
            <select required style={inputStyle} value={cecoIdSel} onChange={e => setCecoIdSel(e.target.value)}>
              <option value="">— Selecciona —</option>
              {cecos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="q4-form-grid-4">
            <div><label style={labelStyle}>Desde</label>
              <input type="date" style={inputStyle} value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><label style={labelStyle}>Hasta</label>
              <input type="date" style={inputStyle} value={to} onChange={e => setTo(e.target.value)} /></div>
            <div><label style={labelStyle}>Estado</label>
              <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PAGADO">Pagado</option>
                <option value="NULO">Nulo</option>
              </select></div>
            {tipo === 'transacciones' && (
              <div><label style={labelStyle}>Tipo</label>
                <select style={inputStyle} value={movementType} onChange={e => onMovement(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="INGRESO">Ingreso</option>
                  <option value="EGRESO">Egreso</option>
                </select></div>
            )}
            <div><label style={labelStyle}>Empresa</label>
              <select style={inputStyle} value={companyId} onChange={e => onEmpresa(e.target.value)}>
                <option value="">Todas</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select></div>
            <div>
              <label style={labelStyle}>CeCo {companyId && <span style={{ color: T.orange }}>· ligado</span>}</label>
              <select style={inputStyle} value={costCenterId} onChange={e => onCeco(e.target.value)}>
                <option value="">Todos {companyId ? '(de la empresa)' : ''}</option>
                {cecosFiltrados.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            {tipo === 'transacciones' && (
              <>
                <div>
                  <label style={labelStyle}>Cuenta {movementType && <span style={{ color: T.orange }}>· ligada</span>}</label>
                  <select style={inputStyle} value={accountId} onChange={e => setAccountId(e.target.value)}>
                    <option value="">Todas {movementType ? `(${movementType.toLowerCase()})` : ''}</option>
                    {accountsFiltradas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Buscar</label>
                  <input style={inputStyle} value={q} onChange={e => setQ(e.target.value)}
                    placeholder="Descripción, factura, boleta" /></div>
              </>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: T.danger,
            borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={generarPreview} disabled={loading} style={{
            background: T.textPrimary, color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
          }}>{loading ? 'Generando…' : '👁 Generar vista previa'}</button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => exportar('excel')} disabled={!preview} style={{
              background: preview ? T.success : T.neutralBg, color: preview ? '#fff' : T.textMuted,
              border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
              cursor: preview ? 'pointer' : 'not-allowed',
            }}>↓ Excel</button>
            <button onClick={() => exportar('pdf')} disabled={!preview} style={{
              background: preview ? T.orange : T.neutralBg, color: preview ? '#fff' : T.textMuted,
              border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
              cursor: preview ? 'pointer' : 'not-allowed',
            }}>↓ PDF</button>
          </div>
        </div>
        {!preview && !loading && (
          <div style={{ color: T.textMuted, fontSize: 12, marginTop: 10 }}>
            Genera la vista previa para revisar el reporte antes de exportarlo.
          </div>
        )}
      </div>

      {/* —— Vista previa —— */}
      {preview && (
        <div style={{
          background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
          padding: 24, marginTop: 16, boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
        }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ color: T.textPrimary, fontSize: 16, fontWeight: 700, margin: 0 }}>{preview.title}</h3>
            {preview.subtitle && <div style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>{preview.subtitle}</div>}
          </div>

          {preview.kpis && preview.kpis.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${preview.kpis.length}, 1fr)`, gap: 12, marginBottom: 18 }} className="q4-kpi-grid">
              {preview.kpis.map(k => (
                <div key={k.label} style={{ background: T.cardHover, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ color: T.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{k.label}</div>
                  <div style={{ color: T.textPrimary, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ color: T.textSec, fontSize: 12, marginBottom: 10 }}>
            {preview.totalRows ?? preview.rows.length} registros
            {preview.truncated && <span style={{ color: T.warning }}> · vista previa limitada a {preview.rows.length}; la exportación incluye todo</span>}
          </div>

          <div style={{ overflow: 'auto', maxHeight: 460, border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardHover, position: 'sticky', top: 0 }}>
                  {preview.columns.map(c => (
                    <th key={c.key} style={{
                      padding: '9px 10px', textAlign: c.align === 'right' ? 'right' : 'left',
                      color: T.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.card : T.cardHover }}>
                    {preview.columns.map(c => (
                      <td key={c.key} style={{
                        padding: '7px 10px', fontSize: 12,
                        textAlign: c.align === 'right' ? 'right' : 'left',
                        color: T.textPrimary, fontVariantNumeric: c.format === 'money' ? 'tabular-nums' : 'normal',
                        whiteSpace: c.format === 'money' || c.format === 'date' ? 'nowrap' : 'normal',
                      }}>{fmtCell(c, r[c.key])}</td>
                    ))}
                  </tr>
                ))}
                {preview.rows.length === 0 && (
                  <tr><td colSpan={preview.columns.length} style={{ padding: '24px 10px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>Sin registros para estos filtros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
