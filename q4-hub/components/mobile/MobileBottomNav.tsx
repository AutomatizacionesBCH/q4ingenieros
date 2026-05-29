'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { MobileDrawer } from './MobileDrawer'

const PRIMARY = [
  { href: '/dashboard',      label: 'Inicio',     icon: '◈' },
  { href: '/transacciones',  label: 'Tx',         icon: '⬡' },
  { href: '/proyecciones',   label: 'Pagos',      icon: '◉' },
  { href: '/flujo-ceco',     label: 'CeCo',       icon: '◐' },
]

const C = {
  bg: '#0F1A2E',
  border: 'rgba(255,255,255,0.1)',
  active: '#E5501E',
  inactive: '#8A9BB8',
  text: '#F0EDE8',
} as const

export function MobileBottomNav() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        zIndex: 200,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
      }}>
        {PRIMARY.map(mod => {
          const active = isActive(mod.href)
          return (
            <Link key={mod.href} href={mod.href} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              textDecoration: 'none',
              minHeight: 60,
              color: active ? C.active : C.inactive,
              fontWeight: active ? 700 : 500,
              transition: 'color 0.15s',
            }}>
              <span style={{ fontSize: 22, transition: 'transform 0.15s',
                transform: active ? 'scale(1.1)' : 'scale(1)' }}>{mod.icon}</span>
              <span style={{ fontSize: 10, letterSpacing: '0.02em' }}>{mod.label}</span>
            </Link>
          )
        })}
        <button onClick={() => setDrawerOpen(true)} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          background: 'none', border: 'none', cursor: 'pointer',
          color: drawerOpen ? C.active : C.inactive,
          minHeight: 60,
        }}>
          <span style={{ fontSize: 22 }}>☰</span>
          <span style={{ fontSize: 10, fontWeight: 500 }}>Menú</span>
        </button>
      </nav>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
