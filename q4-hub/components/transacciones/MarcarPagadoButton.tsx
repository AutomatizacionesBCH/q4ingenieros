'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'PAGADO' | 'PENDIENTE' | 'NULO'

export function MarcarPagadoButton({ txId, currentStatus }: { txId: number; currentStatus: Status }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const nextStatus: Status = currentStatus === 'PAGADO' ? 'PENDIENTE' : 'PAGADO'
  const label = currentStatus === 'PAGADO' ? '↺ Revertir' : '✓ Pagado'
  const isRevert = currentStatus === 'PAGADO'

  const onClick = async () => {
    if (isRevert && !confirm('¿Marcar esta transacción como pendiente otra vez?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/transacciones/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
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

  const style: React.CSSProperties = isRevert
    ? {
        background: loading ? '#F8FAFC' : '#FEFCE8',
        color: '#CA8A04', border: '1px solid rgba(212,160,23,0.3)',
      }
    : {
        background: loading ? '#F8FAFC' : '#F0FDF4',
        color: '#16A34A', border: '1px solid rgba(61,139,94,0.3)',
      }

  return (
    <button onClick={onClick} disabled={loading} style={{
      ...style,
      borderRadius: 6, padding: '4px 10px',
      fontSize: 11, fontWeight: 700,
      cursor: loading ? 'wait' : 'pointer',
      whiteSpace: 'nowrap',
    }}>{loading ? '…' : label}</button>
  )
}
