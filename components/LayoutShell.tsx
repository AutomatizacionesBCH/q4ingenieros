'use client'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SIDEBAR_W } from '@/components/Sidebar'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  return (
    <main
      style={{
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        paddingBottom: isMobile ? 60 : 0,
        flex: 1,
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </main>
  )
}
