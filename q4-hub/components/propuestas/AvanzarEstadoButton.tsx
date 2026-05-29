'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA'

const NEXT: Record<Status, Status | null> = {
  BORRADOR: 'ENVIADA',
  ENVIADA: 'ACEPTADA',
  ACEPTADA: null,
}

const LABEL: Record<Status, string> = {
  BORRADOR: '→ Marcar enviada',
  ENVIADA: '✓ Marcar aceptada',
  ACEPTADA: '',
}

const COLOR: Record<Status, { bg: string; fg: string; bd: string }> = {
  BORRADOR: { bg: '#FEFCE8', fg: '#CA8A04', bd: '#FDE68A' },
  ENVIADA:  { bg: '#F0FDF4',  fg: '#16A34A', bd: '#BBF7D0' },
  ACEPTADA: { bg: 'transparent', fg: '#94A3B8', bd: '#E2E8F0' },
}

export function AvanzarEstadoButton({ id, currentStatus }: { id: number; currentStatus: Status }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const next = NEXT[currentStatus]
  if (!next) return null

  const onClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/propuestas-cierre/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Error')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      alert('Error de red')
      setLoading(false)
    }
  }

  const c = COLOR[currentStatus]

  return (
    <button onClick={onClick} disabled={loading} style={{
      background: loading ? '#F8FAFC' : c.bg,
      color: c.fg, border: `1px solid ${c.bd}`,
      borderRadius: 6, padding: '4px 10px',
      fontSize: 11, fontWeight: 700,
      cursor: loading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
    }}>{loading ? '…' : LABEL[currentStatus]}</button>
  )
}
