'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'ACTIVA' | 'CERRADA' | 'CANCELADA'

export function CerrarOCButton({ id, currentStatus }: { id: number; currentStatus: Status }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isClosed = currentStatus !== 'ACTIVA'
  const next: Status = currentStatus === 'ACTIVA' ? 'CERRADA' : 'ACTIVA'
  const label = isClosed ? '↺ Reabrir' : '✓ Cerrar'

  const onClick = async () => {
    if (!confirm(isClosed ? '¿Reabrir esta OC?' : '¿Cerrar esta OC?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ordenes-compra/${id}`, {
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

  const style: React.CSSProperties = isClosed
    ? {
        background: loading ? '#1D2D47' : 'rgba(212,160,23,0.12)',
        color: '#D4A017', border: '1px solid rgba(212,160,23,0.3)',
      }
    : {
        background: loading ? '#1D2D47' : 'rgba(90,112,144,0.18)',
        color: '#8A9BB8', border: '1px solid rgba(255,255,255,0.1)',
      }

  return (
    <button onClick={onClick} disabled={loading} style={{
      ...style,
      borderRadius: 6, padding: '4px 10px',
      fontSize: 11, fontWeight: 700,
      cursor: loading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
    }}>{loading ? '…' : label}</button>
  )
}
