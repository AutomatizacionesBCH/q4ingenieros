'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: number; label: string }

export type FacturaFormValues = {
  companyId?: number | null
  costCenterId?: number | null
  epNumber?: string
  invoiceNumber?: string
  amount?: string
  received?: string
  issueDate?: string
  paymentDate?: string
  status?: 'PAGADO' | 'PENDIENTE' | 'NULO'
  factoring?: boolean
  factoringInterest?: string
  factoringDueDate?: string
  entity?: string
}

type Props = {
  initial?: FacturaFormValues
  companies: Option[]
  cecos: (Option & { companyId: number })[]
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

export function FacturaForm({ initial, companies, cecos, mode, id }: Props) {
  const router = useRouter()
  const [v, setV] = useState<FacturaFormValues>({
    status: 'PENDIENTE',
    factoring: false,
    received: '0',
    ...initial,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCecos = useMemo(
    () => v.companyId ? cecos.filter(c => c.companyId === v.companyId) : cecos,
    [v.companyId, cecos]
  )

  const set = <K extends keyof FacturaFormValues>(k: K, value: FacturaFormValues[K]) => {
    setV(prev => ({ ...prev, [k]: value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const url = mode === 'create' ? '/api/facturas-emitidas' : `/api/facturas-emitidas/${id}`
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
      router.push('/facturas-emitidas')
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
        <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 18,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos de la factura</h2>
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

          <Field label="N° EP">
            <input style={inputStyle} value={v.epNumber ?? ''}
              onChange={e => set('epNumber', e.target.value)} placeholder="EP-01" />
          </Field>
          <Field label="N° Factura">
            <input style={inputStyle} value={v.invoiceNumber ?? ''}
              onChange={e => set('invoiceNumber', e.target.value)} placeholder="1234" />
          </Field>
          <Field label="Fecha emisión">
            <input type="date" style={inputStyle} value={v.issueDate ?? ''}
              onChange={e => set('issueDate', e.target.value)} />
          </Field>
          <Field label="Fecha venc/pago">
            <input type="date" style={inputStyle} value={v.paymentDate ?? ''}
              onChange={e => set('paymentDate', e.target.value)} />
          </Field>

          <Field label="Monto factura *">
            <input required type="number" step="0.01" style={inputStyle} value={v.amount ?? ''}
              onChange={e => set('amount', e.target.value)} />
          </Field>
          <Field label="Recibido">
            <input type="number" step="0.01" style={inputStyle} value={v.received ?? ''}
              onChange={e => set('received', e.target.value)} />
          </Field>
          <Field label="Estado">
            <select style={inputStyle} value={v.status}
              onChange={e => set('status', e.target.value as 'PAGADO' | 'PENDIENTE' | 'NULO')}>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="PAGADO">PAGADO</option>
              <option value="NULO">NULO</option>
            </select>
          </Field>
          <div />
        </div>
      </section>

      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          color: C.text, fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={v.factoring ?? false}
            onChange={e => set('factoring', e.target.checked)} />
          Factoring
        </label>

        {v.factoring && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 18 }}>
            <Field label="Entidad factoring">
              <input style={inputStyle} value={v.entity ?? ''}
                onChange={e => set('entity', e.target.value)} placeholder="Banco / factoring" />
            </Field>
            <Field label="Interés (decimal, ej 0.0250)">
              <input type="number" step="0.0001" style={inputStyle} value={v.factoringInterest ?? ''}
                onChange={e => set('factoringInterest', e.target.value)} />
            </Field>
            <Field label="Fecha venc. factoring">
              <input type="date" style={inputStyle} value={v.factoringDueDate ?? ''}
                onChange={e => set('factoringDueDate', e.target.value)} />
            </Field>
          </div>
        )}
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.push('/facturas-emitidas')} style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
        }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{
          background: C.orange, color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Guardando…' : mode === 'create' ? 'Crear factura' : 'Guardar cambios'}</button>
      </div>
    </form>
  )
}
