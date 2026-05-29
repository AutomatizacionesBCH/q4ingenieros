'use client'
import { useState } from 'react'
import { T } from '@/lib/theme'

type Option = { id: number; label: string }

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
}: { companies: Option[]; cecos: Option[]; accounts: Option[] }) {
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

  const buildUrl = (formato: 'pdf' | 'excel') => {
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
    return `/api/reportes/generar?${p.toString()}`
  }

  const exportar = (formato: 'pdf' | 'excel') => {
    const url = buildUrl(formato)
    if (!url) { alert('Selecciona un CeCo'); return }
    window.open(url, '_blank')
  }

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: 24, marginBottom: 24, boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      <h2 style={{ color: T.textPrimary, fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 18,
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>Generar reporte</h2>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Tipo de reporte</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { v: 'transacciones', lab: '📋 Transacciones' },
            { v: 'proyecciones', lab: '📅 Proyecciones (egresos)' },
            { v: 'ceco', lab: '🏗 Por CeCo' },
          ] as { v: Tipo; lab: string }[]).map(o => (
            <button key={o.v} onClick={() => setTipo(o.v)} style={{
              flex: 1, padding: '12px 16px', borderRadius: 8,
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
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
              <select style={inputStyle} value={movementType} onChange={e => setMovementType(e.target.value)}>
                <option value="">Todos</option>
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </select></div>
          )}
          <div><label style={labelStyle}>Empresa</label>
            <select style={inputStyle} value={companyId} onChange={e => setCompanyId(e.target.value)}>
              <option value="">Todas</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></div>
          <div><label style={labelStyle}>CeCo</label>
            <select style={inputStyle} value={costCenterId} onChange={e => setCostCenterId(e.target.value)}>
              <option value="">Todos</option>
              {cecos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></div>
          {tipo === 'transacciones' && (
            <>
              <div><label style={labelStyle}>Cuenta</label>
                <select style={inputStyle} value={accountId} onChange={e => setAccountId(e.target.value)}>
                  <option value="">Todas</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select></div>
              <div><label style={labelStyle}>Buscar</label>
                <input style={inputStyle} value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Descripción, factura, boleta" /></div>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={() => exportar('excel')} style={{
          background: T.success, color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}>↓ Excel</button>
        <button onClick={() => exportar('pdf')} style={{
          background: T.orange, color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}>↓ PDF</button>
      </div>
    </div>
  )
}
