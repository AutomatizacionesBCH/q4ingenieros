'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const C = {
  orange:    '#E5501E',
  primary:   '#F0EDE8',
  secondary: '#8A9BB8',
} as const

const TABS = [
  { href: '/proyectos', label: 'Proyectos',     icon: '⬡' },
  { href: '/control',   label: 'Control 2026',  icon: '◈' },
] as const

export function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex items-stretch h-full" aria-label="Módulos principales">
      {TABS.map(tab => {
        const isActive =
          pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="relative flex items-center gap-1.5 px-4 text-xs font-medium transition-colors duration-100 select-none"
            style={{
              color: isActive ? C.primary : C.secondary,
              borderBottom: isActive
                ? `2px solid ${C.orange}`
                : '2px solid transparent',
            }}
          >
            <span
              aria-hidden
              style={{
                fontSize: 11,
                color: isActive ? C.orange : C.secondary,
                lineHeight: 1,
              }}
            >
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
