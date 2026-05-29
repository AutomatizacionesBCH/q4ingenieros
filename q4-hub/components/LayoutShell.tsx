'use client'
import { SIDEBAR_W } from './Sidebar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { T } from '@/lib/theme'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  return (
    <main style={{
      marginLeft: isMobile ? 0 : SIDEBAR_W,
      paddingBottom: isMobile ? 72 : 0,
      minHeight: '100vh',
      background: T.canvas,
      color: T.textPrimary,
    }}>
      {children}
    </main>
  )
}
