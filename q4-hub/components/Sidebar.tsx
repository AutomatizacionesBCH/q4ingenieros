'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useIsMobile } from '@/hooks/useIsMobile'

export const SIDEBAR_W = 240

const C = {
  bg: '#0F1A2E', active: 'rgba(229,80,30,0.13)', border: '#E5501E',
  text: '#F0EDE8', dim: '#8A9BB8', muted: '#5A7090',
  divider: 'rgba(255,255,255,0.07)',
} as const

const MODULES = [
  { href: '/',                    label: 'Dashboard',           short: 'Home',    icon: '◈' },
  { href: '/transacciones',       label: 'Transacciones',       short: 'BD',      icon: '⬡' },
  { href: '/proyecciones',        label: 'Proyecciones',        short: 'Pagos',   icon: '◉' },
  { href: '/flujo-ceco',          label: 'Flujo por CeCo',      short: 'CeCo F',  icon: '◐' },
  { href: '/facturas-emitidas',   label: 'Facturas Emitidas',   short: 'Facturas',icon: '◧' },
  { href: '/ordenes-compra',      label: 'Órdenes de Compra',   short: 'OC',      icon: '◎' },
  { href: '/propuestas-cierre',   label: 'Propuestas Cierre',   short: 'Cierres', icon: '◫' },
  { href: '/bancos',              label: 'Bancos',              short: 'Bancos',  icon: '◰' },
  { href: '/reportes',            label: 'Reportes',            short: 'EE.RR',   icon: '◱' },
  { href: '/centros-costo',       label: 'Centros de Costo',    short: 'CeCo',    icon: '◲' },
  { href: '/proveedores',         label: 'Proveedores',         short: 'Prov.',   icon: '◳' },
  { href: '/plan-cuentas',        label: 'Plan de Cuentas',     short: 'Plan',    icon: '◴' },
]

export function Sidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
        background: C.bg, borderTop: `1px solid ${C.divider}`,
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        zIndex: 200, WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {MODULES.map(mod => {
          const active = pathname === mod.href || pathname.startsWith(mod.href + '/')
          return (
            <Link key={mod.href} href={mod.href} style={{
              minWidth: 72, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              textDecoration: 'none', padding: '6px 10px',
              borderTop: `2px solid ${active ? C.border : 'transparent'}`,
              background: active ? C.active : 'transparent',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 18, opacity: active ? 1 : 0.5 }}>{mod.icon}</span>
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500,
                color: active ? C.text : C.dim, whiteSpace: 'nowrap' }}>
                {mod.short}
              </span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, width: SIDEBAR_W, height: '100vh',
      background: C.bg, borderRight: `1px solid ${C.divider}`,
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      <div style={{
        padding: '18px 16px', borderBottom: `1px solid ${C.divider}`,
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <Image src="/logo.jpeg" alt="Q4" width={36} height={36}
          style={{ borderRadius: 6 }} priority />
        <div>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Q4 Hub</div>
          <div style={{ color: C.muted, fontSize: 10 }}>Nobarso · IDQ4</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: C.muted, textTransform: 'uppercase', padding: '0 8px 10px',
        }}>Módulos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MODULES.map(mod => {
            const active = pathname === mod.href || pathname.startsWith(mod.href + '/')
            return (
              <Link key={mod.href} href={mod.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8,
                borderLeft: `3px solid ${active ? C.border : 'transparent'}`,
                background: active ? C.active : 'transparent',
                color: active ? C.text : C.dim,
                fontSize: 13, fontWeight: active ? 600 : 400,
                textDecoration: 'none', transition: 'background 0.1s',
              }}>
                <span style={{ fontSize: 14, opacity: active ? 1 : 0.5 }}>{mod.icon}</span>
                {mod.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.divider}`, flexShrink: 0 }}>
        <div style={{ color: C.muted, fontSize: 10 }}>Q4 Hub · v1.0</div>
      </div>
    </aside>
  )
}
