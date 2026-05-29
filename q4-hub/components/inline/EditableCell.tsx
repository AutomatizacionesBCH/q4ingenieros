'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { T } from '@/lib/theme'

type Kind = 'text' | 'number' | 'money' | 'date' | 'select'

type Option = { value: string | number; label: string }

type Props = {
  txId: number
  field: string  // ej "description", "paymentDate", "costCenterId"
  kind: Kind
  value: string | number | null | undefined
  display: React.ReactNode
  options?: Option[]
  align?: 'left' | 'right'
  width?: number | string
  fontFamily?: string
  color?: string
  fontWeight?: number
  endpoint?: string  // default: /api/transacciones/{txId}
}

const cellBase: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  fontSize: 13,
  cursor: 'pointer',
  minHeight: 22,
  display: 'inline-block',
  width: '100%',
  boxSizing: 'border-box',
}

export function EditableCell({
  txId, field, kind, value, display, options,
  align = 'left', width, fontFamily, color = T.textPrimary, fontWeight = 400,
  endpoint,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value))
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement | HTMLSelectElement | null>(null)
  const url = endpoint ?? `/api/transacciones/${txId}`

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      if (ref.current instanceof HTMLInputElement) ref.current.select()
    }
  }, [editing])

  useEffect(() => {
    setDraft(value == null ? '' : String(value))
  }, [value])

  const cancel = () => { setEditing(false); setDraft(value == null ? '' : String(value)) }

  const save = async () => {
    if (saving) return
    const newRaw = draft
    const oldRaw = value == null ? '' : String(value)
    if (newRaw === oldRaw) { setEditing(false); return }

    setSaving(true)
    let payload: string | number | null = newRaw
    if (kind === 'number' || kind === 'money' || kind === 'select') {
      if (newRaw === '') payload = null
      else payload = kind === 'select' ? Number(newRaw) : Number(newRaw)
      if (kind !== 'select' && Number.isNaN(payload as number)) payload = null
    }
    if (kind === 'date' && newRaw === '') payload = null
    if (kind === 'text' && newRaw === '') payload = null

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: payload }),
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

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); save() }
    else if (e.key === 'Escape') cancel()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '4px 8px',
    border: `1px solid ${T.orange}`, borderRadius: 4,
    background: T.card, color: T.textPrimary, fontSize: 13,
    outline: 'none', textAlign: align,
    fontFamily: fontFamily ?? 'inherit',
  }

  if (editing) {
    if (kind === 'select') {
      return (
        <select ref={ref as React.RefObject<HTMLSelectElement>}
          style={inputStyle} value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save} onKeyDown={onKey} disabled={saving}>
          <option value="">— Ninguno —</option>
          {options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )
    }
    return (
      <input ref={ref as React.RefObject<HTMLInputElement>}
        type={kind === 'date' ? 'date' : (kind === 'number' || kind === 'money' ? 'number' : 'text')}
        step={kind === 'money' ? '0.01' : kind === 'number' ? 'any' : undefined}
        style={inputStyle} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save} onKeyDown={onKey} disabled={saving} />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        ...cellBase, textAlign: align, fontFamily, color, fontWeight,
        width, transition: 'background-color 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = T.cardHover)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      title="Click para editar"
    >
      {display ?? <span style={{ color: T.textMuted }}>—</span>}
    </span>
  )
}
