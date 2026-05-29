'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { T } from '@/lib/theme'

type Option = { id: number; code: string; name: string }

export function CecoAutocomplete({
  txId, currentCode, currentId, cecos,
}: {
  txId: number
  currentCode: string | null
  currentId: number | null
  cecos: Option[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [q, setQ] = useState(currentCode ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const save = async (cecoId: number | null) => {
    if (saving) return
    if (cecoId === currentId) { setEditing(false); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/transacciones/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costCenterId: cecoId }),
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
    const v = q.trim().toUpperCase()
    if (!v) { save(null); return }
    const match = cecos.find(c => c.code.toUpperCase() === v)
    if (match) save(match.id)
    else {
      const partial = cecos.find(c => c.code.toUpperCase().startsWith(v) || c.name.toUpperCase().includes(v))
      if (partial) save(partial.id)
      else { alert('CeCo no encontrado'); setQ(currentCode ?? '') }
    }
  }

  if (editing) {
    return (
      <>
        <input ref={inputRef} list={`ceco-list-${txId}`}
          value={q} onChange={e => setQ(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit() }
            else if (e.key === 'Escape') { setEditing(false); setQ(currentCode ?? '') }
          }}
          style={{
            width: '100%', padding: '4px 8px',
            border: `1px solid ${T.orange}`, borderRadius: 4,
            background: T.card, color: T.textPrimary, fontSize: 12,
            outline: 'none', fontFamily: 'monospace',
          }}
          placeholder="Código CeCo" />
        <datalist id={`ceco-list-${txId}`}>
          {cecos.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
        </datalist>
      </>
    )
  }

  return (
    <span onClick={() => setEditing(true)}
      style={{
        padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
        color: T.orange, fontFamily: 'monospace', fontSize: 12,
        display: 'inline-block', transition: 'background-color 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = T.cardHover)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      title="Click para editar CeCo">
      {currentCode ?? <span style={{ color: T.textMuted }}>—</span>}
    </span>
  )
}
