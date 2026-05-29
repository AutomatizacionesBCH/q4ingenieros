'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type Option = { id: number; label: string; sub?: string }

export function CeCoSelector({ cecos, current }: { cecos: Option[]; current: number | null }) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const change = (val: string) => {
    const next = new URLSearchParams(params.toString())
    if (val) next.set('ceco', val); else next.delete('ceco')
    startTransition(() => router.push(`/flujo-ceco?${next.toString()}`))
  }

  return (
    <div style={{ flex: 1, maxWidth: 540 }}>
      <label style={{
        display: 'block', color: '#94A3B8', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
      }}>Centro de Costo</label>
      <select
        value={current ?? ''}
        onChange={e => change(e.target.value)}
        disabled={pending}
        style={{
          width: '100%',
          background: '#F0F2F6',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '11px 14px',
          color: '#0F1A2E',
          fontSize: 14,
          outline: 'none',
          opacity: pending ? 0.6 : 1,
        }}>
        <option value="">— Selecciona un CeCo —</option>
        {cecos.map(c => (
          <option key={c.id} value={c.id}>
            {c.label}{c.sub ? ` (${c.sub})` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
