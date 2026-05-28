'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Company = { id: number; name: string }

const C = {
  bg: '#162138',
  border: 'rgba(255,255,255,0.08)',
  text: '#F0EDE8',
  dim: '#8A9BB8',
  muted: '#5A7090',
  orange: '#E5501E',
  field: '#0F1A2E',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.field,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '9px 12px',
  color: C.text,
  fontSize: 13,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 5,
}

export function RegistroSaldoForm({ companies }: { companies: Company[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const [bank, setBank] = useState<'CHILE' | 'BCI' | 'ITAU' | 'SANTANDER'>('CHILE')
  const [type, setType] = useState<'CONTABLE' | 'LINEA_CREDITO'>('CONTABLE')
  const [companyId, setCompanyId] = useState<number | ''>(companies[0]?.id ?? '')
  const [balance, setBalance] = useState('')
  const [recordedAt, setRecordedAt] = useState(today)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/bancos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank, type, companyId, balance, recordedAt }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setBalance('')
      setLoading(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        background: C.orange, color: '#fff', border: 'none',
        borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
        cursor: 'pointer',
      }}>+ Registrar saldo</button>
    )
  }

  return (
    <div style={{
      background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 20, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Nuevo registro de saldo
        </h3>
        <button onClick={() => { setOpen(false); setError(null) }} style={{
          background: 'transparent', border: 'none', color: C.dim,
          fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>×</button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)',
          borderRadius: 8, padding: '8px 12px', color: '#E0928B', fontSize: 12,
          marginBottom: 14,
        }}>{error}</div>
      )}

      <form onSubmit={submit} style={{ display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Banco *</label>
          <select required style={inputStyle} value={bank}
            onChange={e => setBank(e.target.value as typeof bank)}>
            <option value="CHILE">Banco de Chile</option>
            <option value="BCI">BCI</option>
            <option value="ITAU">Itaú</option>
            <option value="SANTANDER">Santander</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Empresa *</label>
          <select required style={inputStyle} value={companyId}
            onChange={e => setCompanyId(e.target.value ? Number(e.target.value) : '')}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select style={inputStyle} value={type}
            onChange={e => setType(e.target.value as typeof type)}>
            <option value="CONTABLE">Contable</option>
            <option value="LINEA_CREDITO">Línea de crédito</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Saldo (CLP) *</label>
          <input required type="number" step="0.01" style={inputStyle} value={balance}
            onChange={e => setBalance(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label style={labelStyle}>Fecha</label>
          <input type="date" style={inputStyle} value={recordedAt}
            onChange={e => setRecordedAt(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} style={{
          background: C.orange, color: '#fff', border: 'none',
          borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          height: 38,
        }}>{loading ? '…' : 'Guardar'}</button>
      </form>
    </div>
  )
}
