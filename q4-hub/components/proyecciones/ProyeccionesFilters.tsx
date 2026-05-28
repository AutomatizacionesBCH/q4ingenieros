'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type Option = { id: number; label: string }

const C = {
  bg: '#0F1A2E',
  border: 'rgba(255,255,255,0.08)',
  text: '#F0EDE8',
  dim: '#8A9BB8',
  muted: '#5A7090',
  orange: '#E5501E',
}

const inputStyle: React.CSSProperties = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '7px 10px',
  color: C.text,
  fontSize: 12,
  outline: 'none',
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

export function ProyeccionesFilters({
  companies,
  cecos,
  accounts,
}: {
  companies: Option[]
  cecos: Option[]
  accounts: Option[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => {
      router.push(`/proyecciones?${next.toString()}`)
    })
  }

  const get = (k: string) => params.get(k) ?? ''

  const clear = () => {
    startTransition(() => router.push('/proyecciones'))
  }

  return (
    <div style={{
      background: '#162138', borderRadius: 12,
      border: `1px solid ${C.border}`, padding: 16, marginBottom: 18,
      opacity: pending ? 0.7 : 1,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) auto',
        gap: 12, alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Desde</label>
          <input type="date" style={{ ...inputStyle, width: '100%' }}
            value={get('from')} onChange={e => update('from', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Hasta</label>
          <input type="date" style={{ ...inputStyle, width: '100%' }}
            value={get('to')} onChange={e => update('to', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Estado</label>
          <select style={{ ...inputStyle, width: '100%' }}
            value={get('status')} onChange={e => update('status', e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option value="NULO">Nulo</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Empresa</label>
          <select style={{ ...inputStyle, width: '100%' }}
            value={get('companyId')} onChange={e => update('companyId', e.target.value)}>
            <option value="">Todas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Centro de Costo</label>
          <select style={{ ...inputStyle, width: '100%' }}
            value={get('costCenterId')} onChange={e => update('costCenterId', e.target.value)}>
            <option value="">Todos</option>
            {cecos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Cuenta</label>
          <select style={{ ...inputStyle, width: '100%' }}
            value={get('accountId')} onChange={e => update('accountId', e.target.value)}>
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
