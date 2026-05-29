'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteMaestroButton({
  url,
  label = 'este registro',
}: {
  url: string
  label?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    if (!confirm(`¿Eliminar ${label}?`)) return
    setLoading(true)
    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Error al eliminar')
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
    <button onClick={onClick} disabled={loading} title="Eliminar" style={{
      background: 'transparent', border: 'none',
      color: loading ? '#94A3B8' : '#475569',
      fontSize: 14, cursor: loading ? 'wait' : 'pointer',
      padding: '2px 6px', lineHeight: 1,
    }}>×</button>
  )
}
