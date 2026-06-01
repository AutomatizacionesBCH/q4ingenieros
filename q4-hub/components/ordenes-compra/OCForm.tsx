'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: number; label: string }

export type OCFormValues = {
  companyId?: number | null
  costCenterId?: number | null
  providerId?: number | null
  projectNumber?: string
  description?: string
  solicitadoPor?: string
  gerencia?: string
  cotizacionNum?: string
  condicionPago?: string
  tipoMoneda?: 'CLP' | 'UF'
  total?: string
  retencion?: string
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
  bg: '#FFFFFF', border: '#E2E8F0', text: '#0F1A2E',
  dim: '#475569', muted: '#94A3B8', orange: '#E5501E', field: '#F0F2F6',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: C.field, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: C.muted, fontSize: 11, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
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
  const [v, setV] = useState<OCFormValues>({ status: 'ACTIVA', tipoMoneda: 'CLP', ...initial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCecos = useMemo(
    () => v.companyId ? cecos.filter(c => c.companyId === v.companyId) : cecos,
    [v.companyId, cecos]
  )

  const set = <K extends keyof OCFormValues>(k: K, value: OCFormValues[K]) =>
    setV(prev => ({ ...prev, [k]: value }))

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
          background: '#FEF2F2', border: '1px solid rgba(192,57,43,0.3)',
          borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13,
        }}>{error}</div>
      )}

      {/* SECCIÓN 1: Empresas y clasificación */}
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

          <Field label="N° Proyecto">
            <input type="text" style={inputStyle} value={v.projectNumber ?? ''}
              onChange={e => set('projectNumber', e.target.value)}
              placeholder="Ej: 215-01" />
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
            <textarea required style={{ ...inputStyle, minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }}
              value={v.description ?? ''} onChange={e => set('description', e.target.value)}
              placeholder="Detalle del servicio o producto" />
          </Field>
        </div>
      </section>

      {/* SECCIÓN 2: Datos para el PDF */}
      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 18,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos del documento</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>

          <Field label="Solicitado por">
            <input type="text" style={inputStyle} value={v.solicitadoPor ?? ''}
              onChange={e => set('solicitadoPor', e.target.value)}
              placeholder="Nombre del solicitante" />
          </Field>

          <Field label="Gerencia / Área">
            <input type="text" style={inputStyle} value={v.gerencia ?? ''}
              onChange={e => set('gerencia', e.target.value)}
              placeholder="Ej: Proyectos" />
          </Field>

          <Field label="N° Cotización">
            <input type="text" style={inputStyle} value={v.cotizacionNum ?? ''}
              onChange={e => set('cotizacionNum', e.target.value)}
              placeholder="Ej: COT-2026-001" />
          </Field>

          <Field label="Condición de pago">
            <input type="text" style={inputStyle} value={v.condicionPago ?? ''}
              onChange={e => set('condicionPago', e.target.value)}
              placeholder="Ej: Transferencia Electrónica" />
          </Field>

          <Field label="Tipo moneda">
            <select style={inputStyle} value={v.tipoMoneda ?? 'CLP'}
              onChange={e => set('tipoMoneda', e.target.value as 'CLP' | 'UF')}>
              <option value="CLP">CLP (Peso chileno)</option>
              <option value="UF">UF (Unidad de Fomento)</option>
            </select>
          </Field>

          <Field label="Total OC *">
            <input required type="number" step="0.01" style={inputStyle} value={v.total ?? ''}
              onChange={e => set('total', e.target.value)} placeholder="0" />
          </Field>

          <Field label="Retención">
            <input type="number" step="0.01" style={inputStyle} value={v.retencion ?? ''}
              onChange={e => set('retencion', e.target.value)} placeholder="0" />
          </Field>

          <Field label="Líquido (calculado)">
            <div style={{
              ...inputStyle, background: '#F8FAFC', color: '#16A34A',
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            }}>
              {v.tipoMoneda === 'UF'
                ? `${((Number(v.total) || 0) - (Number(v.retencion) || 0)).toFixed(2)} UF`
                : `$ ${((Number(v.total) || 0) - (Number(v.retencion) || 0)).toLocaleString('es-CL')}`
              }
            </div>
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
