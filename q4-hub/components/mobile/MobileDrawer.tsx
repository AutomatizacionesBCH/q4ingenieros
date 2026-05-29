'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const SECONDARY = [
  { href: '/facturas-emitidas',  label: 'Facturas Emitidas',  icon: '◧' },
  { href: '/ordenes-compra',     label: 'Órdenes de Compra',  icon: '◎' },
  { href: '/propuestas-cierre',  label: 'Propuestas Cierre',  icon: '◫' },
  { href: '/bancos',             label: 'Bancos',             icon: '◰' },
  { href: '/reportes',           label: 'Reportes',           icon: '◱' },
  { href: '/centros-costo',      label: 'Centros de Costo',   icon: '◲' },
  { href: '/proveedores',        label: 'Proveedores',        icon: '◳' },
  { href: '/plan-cuentas',       label: 'Plan de Cuentas',    icon: '◴' },
]

const C = {
  bg: '#0F1A2E',
  card: '#162138',
  border: 'rgba(255,255,255,0.08)',
  text: '#F0EDE8',
  muted: '#5A7090',
  dim: '#8A9BB8',
  orange: '#E5501E',
} as const

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
          zIndex: 300,
        }}
      />
      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, bottom: 0, right: 0,
        width: '85%', maxWidth: 340,
        background: C.bg,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 301,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.25)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 12px)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Image src="/logo.jpeg" alt="Q4" width={40} height={40}
            style={{ borderRadius: 8 }} priority />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>Q4 Hub</div>
            <div style={{ color: C.muted, fontSize: 11 }}>Nobarso · IDQ4</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: C.dim,
            fontSize: 24, cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          <div style={{
            color: C.muted, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '8px 12px',
          }}>Más módulos</div>
          {SECONDARY.map(mod => {
            const active = pathname === mod.href || pathname.startsWith(mod.href + '/')
            return (
              <Link key={mod.href} href={mod.href} onClick={onClose} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 14px', borderRadius: 10,
                borderLeft: `3px solid ${active ? C.orange : 'transparent'}`,
                background: active ? 'rgba(229,80,30,0.12)' : 'transparent',
                color: active ? C.text : C.dim,
                fontSize: 14, fontWeight: active ? 600 : 500,
                textDecoration: 'none',
                marginBottom: 2,
              }}>
                <span style={{ fontSize: 18, opacity: active ? 1 : 0.6, width: 24 }}>{mod.icon}</span>
                {mod.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 11 }}>
          Q4 Hub · v1.0
        </div>
      </div>
    </>
  )
}
