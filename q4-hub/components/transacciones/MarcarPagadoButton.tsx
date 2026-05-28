'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MarcarPagadoButton({ txId }: { txId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transacciones/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAGADO' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Error al marcar como pagado')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      alert('Error de red')
      setLoading(false)
    }
  }

  return (
    <button onClick={onClick} disabled={loading} style={{
      background: loading ? '#1D2D47' : 'rgba(61,139,94,0.15)',
      color: '#3D8B5E',
      border: '1px solid rgba(61,139,94,0.3)',
      borderRadius: 6,
      padding: '4px 10px',
      fontSize: 11,
      fontWeight: 700,
      cursor: loading ? 'wait' : 'pointer',
      whiteSpace: 'nowrap',
    }}>{loading ? '…' : '✓ Pagado'}</button>
  )
}
