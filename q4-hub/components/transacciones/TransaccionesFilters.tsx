'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'

type Option = { id: number; label: string }

const C = {
  bg: '#0F1A2E',
  border: 'rgba(255,255,255,0.08)',
  text: '#F0EDE8',
  dim: '#8A9BB8',
  muted: '#5A7090',
}

const inputStyle: React.CSSProperties = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '7px 10px',
  color: C.text,
  fontSize: 12,
  outline: 'none',
  width: '100%',
  minWidth: 0,
}

const labelStyle: React.CSSProperties = {
  color: C.muted,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 4,
  display: 'block',
}

export function TransaccionesFilters({
  companies, cecos, accounts,
}: {
  companies: Option[]
  cecos: Option[]
  accounts: Option[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [q, setQ] = useState(params.get('q') ?? '')

  // Debounce search
  useEffect(() => {
    const current = params.get('q') ?? ''
    if (q === current) return
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (q) next.set('q', q); else next.delete('q')
      next.delete('page')
      startTransition(() => router.push(`/transacciones?${next.toString()}`))
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value); else next.delete(key)
    next.delete('page')
    startTransition(() => router.push(`/transacciones?${next.toString()}`))
  }
  const get = (k: string) => params.get(k) ?? ''
  const clear = () => {
    setQ('')
    startTransition(() => router.push('/transacciones'))
  }

  return (
    <div style={{
      background: '#162138', borderRadius: 12,
      border: `1px solid ${C.border}`, padding: 14, marginBottom: 14,
      opacity: pending ? 0.7 : 1,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(6, 1fr) auto',
        gap: 10, alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Buscar</label>
          <input style={inputStyle} value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Descripción, factura, boleta..." />
        </div>
        <div>
          <label style={labelStyle}>Desde</label>
          <input type="date" style={inputStyle} value={get('from')}
            onChange={e => update('from', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Hasta</label>
          <input type="date" style={inputStyle} value={get('to')}
            onChange={e => update('to', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select style={inputStyle} value={get('movementType')}
            onChange={e => update('movementType', e.target.value)}>
            <option value="">Todos</option>
            <option value="INGRESO">Ingreso</option>
            <option value="EGRESO">Egreso</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Estado</label>
          <select style={inputStyle} value={get('status')}
            onChange={e => update('status', e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option value="NULO">Nulo</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Empresa</label>
          <select style={inputStyle} value={get('companyId')}
            onChange={e => update('companyId', e.target.value)}>
            <option value="">Todas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>CeCo</label>
          <select style={inputStyle} value={get('costCenterId')}
            onChange={e => update('costCenterId', e.target.value)}>
            <option value="">Todos</option>
            {cecos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Cuenta</label>
          <select style={inputStyle} value={get('accountId')}
            onChange={e => update('accountId', e.target.value)}>
            <option value="">Todas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <button onClick={clear} style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer',
          height: 32,
        }}>Limpiar</button>
      </div>
    </div>
  )
}
