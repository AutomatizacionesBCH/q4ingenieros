'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function EliminarPropuestaButton({ id }: { id: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    if (!confirm('¿Eliminar esta propuesta? No se puede deshacer.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/propuestas-cierre/${id}`, { method: 'DELETE' })
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
      color: loading ? '#5A7090' : '#8A9BB8',
      fontSize: 14, cursor: loading ? 'wait' : 'pointer',
      padding: '2px 6px', lineHeight: 1,
    }}>×</button>
  )
}
