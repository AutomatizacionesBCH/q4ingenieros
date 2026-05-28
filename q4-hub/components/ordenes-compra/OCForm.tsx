'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: number; label: string }

export type OCFormValues = {
  companyId?: number | null
  costCenterId?: number | null
  providerId?: number | null
  description?: string
  total?: string
  status?: 'ACTIVA' | 'CERRADA' | 'CANCELADA'
}

type Props = {
  initial?: OCFormValues
  companies: Option[]
  cecos: (Option & { companyId: number })[]
  providers: Option[]
  mode: 'create' | 'edit'
  id?: number
}

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
  padding: '10px 12px',
  color: C.text,
  fontSize: 13,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 6,
}

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export function OCForm({ initial, companies, cecos, providers, mode, id }: Props) {
  const router = useRouter()
  const [v, setV] = useState<OCFormValues>({ status: 'ACTIVA', ...initial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCecos = useMemo(
    () => v.companyId ? cecos.filter(c => c.companyId === v.companyId) : cecos,
    [v.companyId, cecos]
  )

  const set = <K extends keyof OCFormValues>(k: K, value: OCFormValues[K]) => {
    setV(prev => ({ ...prev, [k]: value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const url = mode === 'create' ? '/api/ordenes-compra' : `/api/ordenes-compra/${id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const created = await res.json().catch(() => null)
      const redirectTo = mode === 'create' && created?.id
        ? `/ordenes-compra/${created.id}`
        : '/ordenes-compra'
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && (
        <div style={{
          background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)',
          borderRadius: 8, padding: '10px 14px', color: '#E0928B', fontSize: 13,
        }}>{error}</div>
      )}

      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 18,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos de la orden</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Field label="Empresa *" span={2}>
            <select required style={inputStyle} value={v.companyId ?? ''}
              onChange={e => set('companyId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Seleccionar —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Centro de Costo" span={2}>
            <select style={inputStyle} value={v.costCenterId ?? ''}
              onChange={e => set('costCenterId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sin CeCo —</option>
              {filteredCecos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="Proveedor" span={2}>
            <select style={inputStyle} value={v.providerId ?? ''}
              onChange={e => set('providerId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sin proveedor —</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Total OC *">
            <input required type="number" step="0.01" style={inputStyle} value={v.total ?? ''}
              onChange={e => set('total', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Estado">
            <select style={inputStyle} value={v.status}
              onChange={e => set('status', e.target.value as OCFormValues['status'])}>
              <option value="ACTIVA">ACTIVA</option>
              <option value="CERRADA">CERRADA</option>
              <option value="CANCELADA">CANCELADA</option>
            </select>
          </Field>

          <Field label="Descripción *" span={4}>
            <textarea required style={{ ...inputStyle, minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }}
              value={v.description ?? ''} onChange={e => set('description', e.target.value)}
              placeholder="Detalle de la orden de compra" />
          </Field>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.push('/ordenes-compra')} style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
        }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{
          background: C.orange, color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Guardando…' : mode === 'create' ? 'Crear OC' : 'Guardar cambios'}</button>
      </div>
    </form>
  )
}
