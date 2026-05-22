'use client'

/**
 * BackButton — thin client component so the detail page (Server Component)
 * can call router.back() without becoming fully client-rendered.
 */
import { useRouter } from 'next/navigation'

const C = {
  secondary: '#8A9BB8',
  muted:     '#5A7090',
} as const

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
      style={{ color: C.secondary }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 11L5 7l4-4" stroke={C.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Volver
    </button>
  )
}
