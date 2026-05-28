'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Category = { id: number | null; name: string }

export type CuentaFormValues = {
  code?: string
  name?: string
  movementType?: 'INGRESO' | 'EGRESO'
  categories?: Category[]
}

type Props = {
  initial?: CuentaFormValues
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

export function CuentaForm({ initial, mode, id }: Props) {
  const router = useRouter()
  const [v, setV] = useState<CuentaFormValues>({
    movementType: 'EGRESO',
    categories: [],
    ...initial,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cats = v.categories ?? []

  const set = <K extends keyof CuentaFormValues>(k: K, value: CuentaFormValues[K]) => {
    setV(prev => ({ ...prev, [k]: value }))
  }

  const updateCat = (i: number, name: string) => {
    set('categories', cats.map((c, idx) => idx === i ? { ...c, name } : c))
  }

  const addCat = () => set('categories', [...cats, { id: null, name: '' }])
  const removeCat = (i: number) => set('categories', cats.filter((_, idx) => idx !== i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const validCats = cats.filter(c => c.name.trim()).map(c => ({
        ...(c.id != null ? { id: c.id } : {}),
        name: c.name.trim(),
      }))

      const url = mode === 'create' ? '/api/maestros/cuentas' : `/api/maestros/cuentas/${id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      // En create, el API recibe categories como string[]; en edit como {id?, name}[]
      const payload = mode === 'create'
        ? { ...v, categories: validCats.map(c => c.name) }
        : { ...v, categories: validCats }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      router.push('/plan-cuentas')
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
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos de la cuenta</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Field label="Código *">
            <input required style={inputStyle} value={v.code ?? ''}
              onChange={e => set('code', e.target.value)} placeholder="Ej: 4.1.001" />
          </Field>
          <Field label="Nombre *" span={2}>
            <input required style={inputStyle} value={v.name ?? ''}
              onChange={e => set('name', e.target.value)} placeholder="Ej: Materiales construcción" />
          </Field>
          <Field label="Tipo *">
            <select required style={inputStyle} value={v.movementType}
              onChange={e => set('movementType', e.target.value as 'INGRESO' | 'EGRESO')}>
              <option value="EGRESO">EGRESO</option>
              <option value="INGRESO">INGRESO</option>
            </select>
          </Field>
        </div>
      </section>

      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categorías</h2>
          <button type="button" onClick={addCat} style={{
            background: 'rgba(229,80,30,0.15)', color: C.orange,
            border: '1px solid rgba(229,80,30,0.3)', borderRadius: 6,
            padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>+ Agregar categoría</button>
        </div>

        {cats.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Sin categorías. Las categorías te ayudan a sub-clasificar transacciones dentro de la cuenta.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cats.map((cat, i) => (
              <div key={i} style={{ display: 'grid',
                gridTemplateColumns: '32px 1fr 32px', gap: 10, alignItems: 'center' }}>
                <span style={{ color: C.muted, fontSize: 12, fontFamily: 'monospace', textAlign: 'center' }}>
                  {i + 1}
                </span>
                <input style={inputStyle} value={cat.name}
                  onChange={e => updateCat(i, e.target.value)}
                  placeholder="Nombre de la categoría" />
                <button type="button" onClick={() => removeCat(i)} title="Eliminar"
                  style={{ background: 'transparent', border: 'none', color: C.dim,
                    fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.push('/plan-cuentas')} style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
        }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{
          background: C.orange, color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Guardando…' : mode === 'create' ? 'Crear cuenta' : 'Guardar cambios'}</button>
      </div>
    </form>
  )
}
