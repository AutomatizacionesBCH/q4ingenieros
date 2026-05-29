'use client'
import { useRouter } from 'next/navigation'
import { T } from '@/lib/theme'

type Props = {
  title: string
  subtitle?: string
  back?: boolean | string
  actions?: React.ReactNode
}

export function MobileHeader({ title, subtitle, back, actions }: Props) {
  const router = useRouter()

  const onBack = () => {
    if (typeof back === 'string') router.push(back)
    else router.back()
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: T.canvas,
      borderBottom: `1px solid ${T.border}`,
      padding: '12px 14px',
      paddingTop: 'calc(12px + env(safe-area-inset-top))',
      display: 'flex', alignItems: 'center', gap: 10,
      minHeight: 56,
      backdropFilter: 'blur(8px)',
      backgroundColor: 'rgba(240, 242, 246, 0.92)',
    }}>
      {back && (
        <button onClick={onBack} aria-label="Volver" style={{
          background: 'transparent', border: 'none',
          color: T.textPrimary, fontSize: 22, padding: '6px 10px',
          cursor: 'pointer', borderRadius: 8,
          minWidth: 40, minHeight: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          color: T.textPrimary, fontSize: 17, fontWeight: 700, margin: 0,
          lineHeight: 1.2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</h1>
        {subtitle && (
          <div style={{ color: T.textSec, fontSize: 11, marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{actions}</div>
      )}
    </header>
  )
}
