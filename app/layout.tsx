import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import './globals.css'
import { NavTabs } from '@/components/NavTabs'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Q4 Ingenieros — Dashboard',
  description: 'Visualizador de proyectos de ingeniería vial',
}

const C = {
  surface:   '#162138',
  primary:   '#F0EDE8',
  secondary: '#8A9BB8',
  border:    'rgba(255,255,255,0.08)',
} as const

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body
        className="antialiased"
        style={{
          background: '#0F1A2E',
          color: '#F0EDE8',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <header
          style={{
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            height: 48,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'stretch',
            paddingLeft: 16,
            paddingRight: 0,
          }}
        >
          {/* Left: logo + company name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingRight: 24,
              borderRight: `1px solid ${C.border}`,
              flexShrink: 0,
            }}
          >
            <Image
              src="/logo.jpeg"
              alt="Q4 Ingenieros"
              width={26}
              height={26}
              style={{ borderRadius: 4 }}
              priority
            />
            <span
              style={{
                color: C.primary,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              Q4 Ingenieros
            </span>
          </div>

          {/* Right: NavTabs */}
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
            <NavTabs />
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
