'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

export function Pagination({
  total,
  page,
  limit,
}: {
  total: number
  page: number
  limit: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null

  const go = (p: number) => {
    const next = new URLSearchParams(params.toString())
    if (p === 1) next.delete('page')
    else next.set('page', String(p))
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  const pages: (number | '...')[] = []
  const window = 2
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  const btn = (active: boolean): React.CSSProperties => ({
    background: active ? '#E5501E' : '#162138',
    color: active ? '#fff' : '#8A9BB8',
    border: `1px solid ${active ? '#E5501E' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 6,
    padding: '5px 11px',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    minWidth: 32,
    fontVariantNumeric: 'tabular-nums',
  })

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginTop: 14, gap: 12, opacity: pending ? 0.6 : 1,
    }}>
      <div style={{ color: '#8A9BB8', fontSize: 12 }}>
        Mostrando <b style={{ color: '#F0EDE8' }}>{from.toLocaleString('es-CL')}</b>–
        <b style={{ color: '#F0EDE8' }}>{to.toLocaleString('es-CL')}</b> de{' '}
        <b style={{ color: '#F0EDE8' }}>{total.toLocaleString('es-CL')}</b>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => go(Math.max(1, page - 1))} disabled={page === 1}
          style={{ ...btn(false), opacity: page === 1 ? 0.4 : 1 }}>‹</button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} style={{ color: '#5A7090', padding: '5px 6px' }}>…</span>
            : <button key={p} onClick={() => go(p)} style={btn(p === page)}>{p}</button>
        )}
        <button onClick={() => go(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          style={{ ...btn(false), opacity: page === totalPages ? 0.4 : 1 }}>›</button>
      </div>
    </div>
  )
}
