'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { T } from '@/lib/theme'

type Option = { id: number; label: string }

const inputStyle: React.CSSProperties = {
  background: T.field, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: '7px 10px', color: T.textPrimary, fontSize: 12,
  outline: 'none', minWidth: 0, width: '100%',
}

const labelStyle: React.CSSProperties = {
  color: T.textMuted, fontSize: 10, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  marginBottom: 4, display: 'block',
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** Last 12 months as { value: 'YYYY-MM', label: 'Mes AAAA' }, newest first.
 *  Built in UTC to match monthBounds() (server default) and getEvolucionMensual's
 *  12-month window — so the dropdown, the header label, and the highlighted bar agree. */
function buildMonths(): { value: string; label: string }[] {
  const now = new Date()
  const out: { value: string; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const yy = d.getUTCFullYear()
    const mm = d.getUTCMonth() // 0-based
    out.push({ value: `${yy}-${String(mm + 1).padStart(2, '0')}`, label: `${MESES[mm]} ${yy}` })
  }
  return out
}

export function DashboardFilters({ companies }: { companies: Option[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const months = buildMonths()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.push(`/dashboard?${next.toString()}`))
  }
  const get = (k: string) => params.get(k) ?? ''
  const clear = () => startTransition(() => router.push('/dashboard'))

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: 16, marginBottom: 18, opacity: pending ? 0.7 : 1,
      boxShadow: '0 1px 2px rgba(15,26,46,0.04)',
    }}>
      <div className="q4-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Empresa</label>
          <select style={inputStyle} value={get('companyId')} onChange={e => update('companyId', e.target.value)}>
            <option value="">Todas (Grupo)</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Mes</label>
          <select style={inputStyle} value={get('month')} onChange={e => update('month', e.target.value)}>
            <option value="">Mes actual</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Estado</label>
          <select style={inputStyle} value={get('status')} onChange={e => update('status', e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option value="NULO">Nulo</option>
          </select>
        </div>
        <button onClick={clear} style={{
          background: T.card, border: `1px solid ${T.border}`, color: T.textSec,
          borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', height: 32,
        }}>Limpiar</button>
      </div>
    </div>
  )
}
