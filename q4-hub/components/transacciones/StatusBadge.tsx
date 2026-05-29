'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { STATUS_COLOR, T } from '@/lib/theme'

type Status = 'PAGADO' | 'PENDIENTE' | 'NULO'

const OPTIONS: Status[] = ['PENDIENTE', 'PAGADO', 'NULO']

export function StatusBadge({ txId, status }: { txId: number; status: Status }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const change = async (next: Status) => {
    setOpen(false)
    if (next === status) return
    setLoading(true)
    try {
      const res = await fetch(`/api/transacciones/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Error al cambiar estado')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      alert('Error de red')
      setLoading(false)
    }
  }

  const c = STATUS_COLOR[status]

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} disabled={loading} style={{
        background: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
        borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {loading ? '…' : status}
        <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: 4, zIndex: 10, minWidth: 110,
          boxShadow: '0 4px 12px rgba(15,26,46,0.12)',
        }}>
          {OPTIONS.map(opt => {
            const co = STATUS_COLOR[opt]
            return (
              <button key={opt} onClick={() => change(opt)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: opt === status ? T.cardHover : 'transparent',
                border: 'none', color: co.fg,
                borderRadius: 4, padding: '6px 10px', fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
              }}>
                {opt}
                {opt === status && <span style={{ marginLeft: 6, opacity: 0.7 }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
