'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: number; label: string }

export type CeCoFormValues = {
  code?: string
  name?: string
  companyId?: number | null
  projectNumber?: string
  location?: string
}

type Props = {
  initial?: CeCoFormValues
  companies: Option[]
  mode: 'create' | 'edit'
  id?: number
}

const C = {
  bg: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F1A2E',
  dim: '#475569',
  muted: '#94A3B8',
  orange: '#E5501E',
  field: '#F0F2F6',
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

export function CeCoForm({ initial, companies, mode, id }: Props) {
  const router = useRouter()
  const [v, setV] = useState<CeCoFormValues>({ ...initial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof CeCoFormValues>(k: K, value: CeCoFormValues[K]) => {
    setV(prev => ({ ...prev, [k]: value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const url = mode === 'create' ? '/api/maestros/ceco' : `/api/maestros/ceco/${id}`
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
      router.push('/centros-costo')
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
          background: '#FEF2F2', border: '1px solid rgba(192,57,43,0.3)',
          borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13,
        }}>{error}</div>
      )}

      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Field label="Código *">
            <input required style={inputStyle} value={v.code ?? ''}
              onChange={e => set('code', e.target.value)} placeholder="Ej: NOV-001" />
          </Field>
          <Field label="Nombre *" span={3}>
            <input required style={inputStyle} value={v.name ?? ''}
              onChange={e => set('name', e.target.value)} placeholder="Ej: Edificio Las Condes" />
          </Field>

          <Field label="Empresa *" span={2}>
            <select required style={inputStyle} value={v.companyId ?? ''}
              onChange={e => set('companyId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Seleccionar —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="N° Proyecto">
            <input style={inputStyle} value={v.projectNumber ?? ''}
              onChange={e => set('projectNumber', e.target.value)} placeholder="Opcional" />
          </Field>
          <Field label="Ubicación">
            <input style={inputStyle} value={v.location ?? ''}
              onChange={e => set('location', e.target.value)} placeholder="Comuna / dirección" />
          </Field>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.push('/centros-costo')} style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
        }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{
          background: C.orange, color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Guardando…' : mode === 'create' ? 'Crear CeCo' : 'Guardar cambios'}</button>
      </div>
    </form>
  )
}
