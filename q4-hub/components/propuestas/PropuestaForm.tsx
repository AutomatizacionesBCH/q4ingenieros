'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: number; label: string }
type Item = { descripcion: string; monto: string }

export type PropuestaFormValues = {
  costCenterId?: number | null
  providerId?: number | null
  description?: string
  observaciones?: string
  status?: 'BORRADOR' | 'ENVIADA' | 'ACEPTADA'
  items?: Item[]
}

type Props = {
  initial?: PropuestaFormValues
  cecos: Option[]
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

function formatCLP(n: number): string {
  if (!Number.isFinite(n)) return '$ 0'
  return '$ ' + Math.round(n).toLocaleString('es-CL')
}

export function PropuestaForm({ initial, cecos, providers, mode, id }: Props) {
  const router = useRouter()
  const [v, setV] = useState<PropuestaFormValues>({
    status: 'BORRADOR',
    items: [],
    ...initial,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = v.items ?? []
  const total = items.reduce((s, it) => s + (Number(it.monto) || 0), 0)

  const set = <K extends keyof PropuestaFormValues>(k: K, value: PropuestaFormValues[K]) => {
    setV(prev => ({ ...prev, [k]: value }))
  }

  const updateItem = (i: number, key: keyof Item, value: string) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [key]: value } : it)
    set('items', next)
  }

  const addItem = () => {
    set('items', [...items, { descripcion: '', monto: '' }])
  }

  const removeItem = (i: number) => {
    set('items', items.filter((_, idx) => idx !== i))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const validItems = items
        .filter(it => it.descripcion.trim() && it.monto !== '' && Number(it.monto) >= 0)
        .map(it => ({ descripcion: it.descripcion.trim(), monto: Number(it.monto) }))

      const url = mode === 'create' ? '/api/propuestas-cierre' : `/api/propuestas-cierre/${id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, items: validItems }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      router.push('/propuestas-cierre')
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
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos generales</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Field label="Centro de Costo" span={2}>
            <select style={inputStyle} value={v.costCenterId ?? ''}
              onChange={e => set('costCenterId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sin CeCo —</option>
              {cecos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Proveedor" span={2}>
            <select style={inputStyle} value={v.providerId ?? ''}
              onChange={e => set('providerId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sin proveedor —</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>

          <Field label="Estado">
            <select style={inputStyle} value={v.status}
              onChange={e => set('status', e.target.value as PropuestaFormValues['status'])}>
              <option value="BORRADOR">BORRADOR</option>
              <option value="ENVIADA">ENVIADA</option>
              <option value="ACEPTADA">ACEPTADA</option>
            </select>
          </Field>
          <div style={{ gridColumn: 'span 3' }} />

          <Field label="Descripción / Asunto *" span={4}>
            <input required style={inputStyle} value={v.description ?? ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Ej: Propuesta cierre obra Las Condes" />
          </Field>
        </div>
      </section>

      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ítems</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: C.muted, fontSize: 12 }}>
              Total: <span style={{ color: C.orange, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {formatCLP(total)}
              </span>
            </span>
            <button type="button" onClick={addItem} style={{
              background: 'rgba(229,80,30,0.15)', color: C.orange,
              border: '1px solid rgba(229,80,30,0.3)', borderRadius: 6,
              padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>+ Agregar ítem</button>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Sin ítems aún. Usa &ldquo;+ Agregar ítem&rdquo; arriba.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'grid',
                gridTemplateColumns: '32px 1fr 200px 32px', gap: 10, alignItems: 'center' }}>
                <span style={{ color: C.muted, fontSize: 12, fontFamily: 'monospace', textAlign: 'center' }}>
                  {i + 1}
                </span>
                <input style={inputStyle} value={it.descripcion}
                  onChange={e => updateItem(i, 'descripcion', e.target.value)}
                  placeholder="Descripción del ítem" />
                <input type="number" step="0.01" style={{ ...inputStyle, textAlign: 'right' }}
                  value={it.monto}
                  onChange={e => updateItem(i, 'monto', e.target.value)}
                  placeholder="0" />
                <button type="button" onClick={() => removeItem(i)} title="Eliminar"
                  style={{ background: 'transparent', border: 'none', color: C.dim,
                    fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <label style={labelStyle}>Observaciones</label>
        <textarea style={{ ...inputStyle, minHeight: 100, fontFamily: 'inherit', resize: 'vertical' }}
          value={v.observaciones ?? ''} onChange={e => set('observaciones', e.target.value)}
          placeholder="Condiciones, notas internas u observaciones adicionales" />
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.push('/propuestas-cierre')} style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
        }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{
          background: C.orange, color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Guardando…' : mode === 'create' ? 'Crear propuesta' : 'Guardar cambios'}</button>
      </div>
    </form>
  )
}
