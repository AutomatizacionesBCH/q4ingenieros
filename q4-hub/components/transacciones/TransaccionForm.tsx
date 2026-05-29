'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: number; label: string; sub?: string }
type Account = { id: number; code: string; name: string; movementType: 'INGRESO' | 'EGRESO'; categories: { id: number; name: string }[] }

export type TransaccionFormValues = {
  companyId?: number | null
  costCenterId?: number | null
  accountId?: number | null
  categoryId?: number | null
  providerId?: number | null
  purchaseOrderId?: number | null
  movementType?: 'INGRESO' | 'EGRESO'
  description?: string
  quantity?: string
  unitValue?: string
  net?: string
  tax?: string
  gross?: string
  paymentDate?: string
  status?: 'PAGADO' | 'PENDIENTE' | 'NULO'
  paymentMethod?: '' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA_CREDITO'
  bank?: '' | 'CHILE' | 'BCI' | 'ITAU' | 'SANTANDER'
  docIssueDate?: string
  docDueDate?: string
  facturaNum?: string
  boletaNum?: string
  gdNumber?: string
  rendicionNum?: string
  currency?: 'CLP' | 'UF'
  notes?: string
}

type POOption = { id: number; label: string; companyId: number; providerId: number | null }

type Props = {
  initial?: TransaccionFormValues
  companies: Option[]
  cecos: (Option & { companyId: number })[]
  accounts: Account[]
  providers: Option[]
  purchaseOrders?: POOption[]
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

export function TransaccionForm({ initial, companies, cecos, accounts, providers, purchaseOrders = [], mode, id }: Props) {
  const router = useRouter()
  const [v, setV] = useState<TransaccionFormValues>({
    movementType: 'EGRESO',
    status: 'PENDIENTE',
    currency: 'CLP',
    tax: '0',
    ...initial,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCecos = useMemo(
    () => v.companyId ? cecos.filter(c => c.companyId === v.companyId) : cecos,
    [v.companyId, cecos]
  )
  const filteredAccounts = useMemo(
    () => v.movementType ? accounts.filter(a => a.movementType === v.movementType) : accounts,
    [v.movementType, accounts]
  )
  const categoriesForAccount = useMemo(
    () => accounts.find(a => a.id === v.accountId)?.categories ?? [],
    [v.accountId, accounts]
  )
  const filteredPOs = useMemo(
    () => v.companyId ? purchaseOrders.filter(p => p.companyId === v.companyId) : purchaseOrders,
    [v.companyId, purchaseOrders]
  )

  const set = <K extends keyof TransaccionFormValues>(k: K, value: TransaccionFormValues[K]) => {
    setV(prev => ({ ...prev, [k]: value }))
  }

  const handleNetChange = (raw: string) => {
    const net = Number(raw) || 0
    const computedTax = Math.round(net * 0.19)
    setV(prev => ({
      ...prev,
      net: raw,
      tax: String(computedTax),
      gross: String(net + computedTax),
    }))
  }

  const handleTaxChange = (raw: string) => {
    const net = Number(v.net) || 0
    const tax = Number(raw) || 0
    setV(prev => ({ ...prev, tax: raw, gross: String(net + tax) }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const url = mode === 'create' ? '/api/transacciones' : `/api/transacciones/${id}`
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
      router.push('/transacciones')
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
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos generales</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Field label="Empresa *">
            <select required style={inputStyle} value={v.companyId ?? ''}
              onChange={e => set('companyId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Seleccionar —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Tipo *">
            <select required style={inputStyle} value={v.movementType}
              onChange={e => { set('movementType', e.target.value as 'INGRESO' | 'EGRESO'); set('accountId', null); set('categoryId', null) }}>
              <option value="EGRESO">EGRESO</option>
              <option value="INGRESO">INGRESO</option>
            </select>
          </Field>
          <Field label="Estado">
            <select style={inputStyle} value={v.status}
              onChange={e => set('status', e.target.value as 'PAGADO' | 'PENDIENTE' | 'NULO')}>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="PAGADO">PAGADO</option>
              <option value="NULO">NULO</option>
            </select>
          </Field>
          <Field label="Moneda">
            <select style={inputStyle} value={v.currency}
              onChange={e => set('currency', e.target.value as 'CLP' | 'UF')}>
              <option value="CLP">CLP</option>
              <option value="UF">UF</option>
            </select>
          </Field>

          <Field label="Descripción *" span={4}>
            <input required style={inputStyle} value={v.description ?? ''}
              onChange={e => set('description', e.target.value)} placeholder="Detalle de la transacción" />
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

          <Field label="Cuenta" span={2}>
            <select style={inputStyle} value={v.accountId ?? ''}
              onChange={e => { set('accountId', e.target.value ? Number(e.target.value) : null); set('categoryId', null) }}>
              <option value="">— Sin cuenta —</option>
              {filteredAccounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
            </select>
          </Field>
          <Field label="Categoría" span={2}>
            <select style={inputStyle} value={v.categoryId ?? ''} disabled={!categoriesForAccount.length}
              onChange={e => set('categoryId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sin categoría —</option>
              {categoriesForAccount.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Orden de compra" span={4}>
            <select style={inputStyle} value={v.purchaseOrderId ?? ''}
              onChange={e => set('purchaseOrderId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sin OC —</option>
              {filteredPOs.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 18,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Montos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <Field label="Cantidad">
            <input type="number" step="0.0001" style={inputStyle} value={v.quantity ?? ''}
              onChange={e => set('quantity', e.target.value)} />
          </Field>
          <Field label="Valor unitario">
            <input type="number" step="0.01" style={inputStyle} value={v.unitValue ?? ''}
              onChange={e => set('unitValue', e.target.value)} />
          </Field>
          <Field label="Neto *">
            <input required type="number" step="0.01" style={inputStyle} value={v.net ?? ''}
              onChange={e => handleNetChange(e.target.value)} />
          </Field>
          <Field label="IVA (auto 19%)">
            <input type="number" step="0.01" style={inputStyle} value={v.tax ?? ''}
              onChange={e => handleTaxChange(e.target.value)} />
          </Field>
          <Field label="Bruto *">
            <input required type="number" step="0.01"
              style={{ ...inputStyle, color: C.orange, fontWeight: 700 }} value={v.gross ?? ''}
              onChange={e => set('gross', e.target.value)} />
          </Field>
        </div>
      </section>

      <section style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 18,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pago y documento</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Field label="Fecha pago">
            <input type="date" style={inputStyle} value={v.paymentDate ?? ''}
              onChange={e => set('paymentDate', e.target.value)} />
          </Field>
          <Field label="Método de pago">
            <select style={inputStyle} value={v.paymentMethod ?? ''}
              onChange={e => set('paymentMethod', e.target.value as TransaccionFormValues['paymentMethod'])}>
              <option value="">—</option>
              <option value="TRANSFERENCIA">TRANSFERENCIA</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="TARJETA_CREDITO">TARJETA CRÉDITO</option>
            </select>
          </Field>
          <Field label="Banco">
            <select style={inputStyle} value={v.bank ?? ''}
              onChange={e => set('bank', e.target.value as TransaccionFormValues['bank'])}>
              <option value="">—</option>
              <option value="CHILE">Banco de Chile</option>
              <option value="BCI">BCI</option>
              <option value="ITAU">Itaú</option>
              <option value="SANTANDER">Santander</option>
            </select>
          </Field>
          <Field label="Fecha emisión doc.">
            <input type="date" style={inputStyle} value={v.docIssueDate ?? ''}
              onChange={e => set('docIssueDate', e.target.value)} />
          </Field>

          <Field label="Fecha vencimiento doc.">
            <input type="date" style={inputStyle} value={v.docDueDate ?? ''}
              onChange={e => set('docDueDate', e.target.value)} />
          </Field>
          <Field label="N° Factura">
            <input style={inputStyle} value={v.facturaNum ?? ''}
              onChange={e => set('facturaNum', e.target.value)} />
          </Field>
          <Field label="N° Boleta">
            <input style={inputStyle} value={v.boletaNum ?? ''}
              onChange={e => set('boletaNum', e.target.value)} />
          </Field>
          <Field label="N° GD / Rendición">
            <input style={inputStyle} value={v.gdNumber ?? ''}
              onChange={e => set('gdNumber', e.target.value)} placeholder="GD o rendición" />
          </Field>

          <Field label="Notas" span={4}>
            <textarea style={{ ...inputStyle, minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }}
              value={v.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.push('/transacciones')} style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
        }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{
          background: C.orange, color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Guardando…' : mode === 'create' ? 'Crear transacción' : 'Guardar cambios'}</button>
      </div>
    </form>
  )
}
