'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { T } from '@/lib/theme'

type Option = { id: number; name: string }

export function ProveedorAutocomplete({
  txId, currentName, currentId, providers,
}: {
  txId: number
  currentName: string | null
  currentId: number | null
  providers: Option[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [q, setQ] = useState(currentName ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const save = async (providerId: number | null) => {
    if (saving) return
    if (providerId === currentId) { setEditing(false); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/transacciones/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Error al guardar')
        setSaving(false)
        return
      }
      setEditing(false)
      setSaving(false)
      router.refresh()
    } catch {
      alert('Error de red')
      setSaving(false)
    }
  }

  const onCommit = () => {
    const v = q.trim()
    if (!v) { save(null); return }
    const match = providers.find(p => p.name === v) ?? providers.find(p => p.name.toLowerCase() === v.toLowerCase())
    if (match) save(match.id)
    else {
      alert('Proveedor no encontrado. Créalo primero en /proveedores.')
      setQ(currentName ?? '')
    }
  }

  if (editing) {
    return (
      <>
        <input ref={inputRef} list={`prov-list-${txId}`}
          value={q} onChange={e => setQ(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit() }
            else if (e.key === 'Escape') { setEditing(false); setQ(currentName ?? '') }
          }}
          style={{
            width: '100%', padding: '4px 8px',
            border: `1px solid ${T.orange}`, borderRadius: 4,
            background: T.card, color: T.textPrimary, fontSize: 12,
            outline: 'none',
          }}
          placeholder="Nombre del proveedor" />
        <datalist id={`prov-list-${txId}`}>
          {providers.map(p => <option key={p.id} value={p.name} />)}
        </datalist>
      </>
    )
  }

  return (
    <span onClick={() => setEditing(true)}
      style={{
        padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
        color: T.textSec, fontSize: 12,
        display: 'inline-block', maxWidth: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = T.cardHover)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      title="Click para editar proveedor">
      {currentName ?? <span style={{ color: T.textMuted }}>—</span>}
    </span>
  )
}
