'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type ProveedorFormValues = {
  name?: string
  rut?: string
  email?: string
  phone?: string
}

type Props = {
  initial?: ProveedorFormValues
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

export function ProveedorForm({ initial, mode, id }: Props) {
  const router = useRouter()
  const [v, setV] = useState<ProveedorFormValues>({ ...initial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ProveedorFormValues>(k: K, value: ProveedorFormValues[K]) => {
    setV(prev => ({ ...prev, [k]: value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const url = mode === 'create' ? '/api/maestros/proveedores' : `/api/maestros/proveedores/${id}`
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
      router.push('/proveedores')
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <Field label="Razón social *">
            <input required style={inputStyle} value={v.name ?? ''}
              onChange={e => set('name', e.target.value)} placeholder="Ej: Constructora ABC SpA" />
          </Field>
          <Field label="RUT *">
            <input required style={inputStyle} value={v.rut ?? ''}
              onChange={e => set('rut', e.target.value)} placeholder="76123456-7" />
          </Field>
          <Field label="Email">
            <input type="email" style={inputStyle} value={v.email ?? ''}
              onChange={e => set('email', e.target.value)} placeholder="contacto@proveedor.cl" />
          </Field>
          <Field label="Teléfono">
            <input style={inputStyle} value={v.phone ?? ''}
              onChange={e => set('phone', e.target.value)} placeholder="+56 9 ..." />
          </Field>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.push('/proveedores')} style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
        }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{
          background: C.orange, color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Guardando…' : mode === 'create' ? 'Crear proveedor' : 'Guardar cambios'}</button>
      </div>
    </form>
  )
}
