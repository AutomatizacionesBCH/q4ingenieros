'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

export const SIDEBAR_W = 240

const C = {
  bg:      '#0F1A2E',
  active:  'rgba(229, 80, 30, 0.13)',
  border:  '#E5501E',
  text:    '#F0EDE8',
  dim:     '#8A9BB8',
  muted:   '#5A7090',
  divider: 'rgba(255,255,255,0.07)',
} as const

const MODULES = [
  { href: '/proyectos',         label: 'Proyectos',            short: 'Proyectos',  icon: '⬡' },
  { href: '/control',           label: 'Control Mensual 2026', short: 'Mensual',    icon: '◈' },
  { href: '/control-pendiente', label: 'Pendiente Histórico',  short: 'Pendiente',  icon: '◉' },
]

function useUF() {
  const [uf, setUf] = useState<{ value: number; date: string } | null>(null)
  useEffect(() => {
    fetch('/api/uf')
      .then(r => r.json())
      .then((d: { value?: number; date?: string }) => {
        if (d.value) setUf({ value: d.value, date: d.date ?? '' })
      })
      .catch(() => {})
  }, [])
  return uf
}

export function Sidebar() {
  const pathname  = usePathname()
  const isMobile  = useIsMobile()
  const uf        = useUF()

  if (isMobile) {
    // ── Bottom tab bar ────────────────────────────────────────────────────────
    return (
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 60,
        background: C.bg,
        borderTop: `1px solid ${C.divider}`,
        display: 'flex',
        zIndex: 200,
      }}>
        {MODULES.map(mod => {
          const active = pathname === mod.href || pathname.startsWith(mod.href + '/')
          return (
            <Link
              key={mod.href}
              href={mod.href}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                textDecoration: 'none',
                borderTop: `2px solid ${active ? C.border : 'transparent'}`,
                background: active ? C.active : 'transparent',
                padding: '6px 4px 4px',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1, opacity: active ? 1 : 0.45 }}>
                {mod.icon}
              </span>
              <span style={{
                fontSize: 9, fontWeight: active ? 700 : 400,
                color: active ? C.text : C.dim,
                letterSpacing: '0.02em',
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {mod.short}
              </span>
            </Link>
          )
        })}
      </nav>
    )
  }

  // ── Desktop sidebar ───────────────────────────────────────────────────────
  return (
    <aside
      style={{
        position: 'fixed', left: 0, top: 0,
        width: SIDEBAR_W, height: '100vh',
        background: C.bg,
        borderRight: `1px solid ${C.divider}`,
        display: 'flex', flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Branding */}
      <div style={{
        padding: '18px 16px',
        borderBottom: `1px solid ${C.divider}`,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <Image
          src="/logo.jpeg"
          alt="Q4 Ingenieros"
          width={36}
          height={36}
          style={{ borderRadius: 6, flexShrink: 0 }}
          priority
        />
        <div>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>
            Q4 Ingenieros
          </div>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>SpA</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 10px' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: C.muted, textTransform: 'uppercase',
          padding: '0 8px 10px',
        }}>
          Módulos
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MODULES.map(mod => {
            const active = pathname === mod.href || pathname.startsWith(mod.href + '/')
            return (
              <Link
                key={mod.href}
                href={mod.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px 9px 9px',
                  borderRadius: 8,
                  borderLeft: `3px solid ${active ? C.border : 'transparent'}`,
                  background: active ? C.active : 'transparent',
                  color: active ? C.text : C.dim,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                <span style={{ fontSize: 14, opacity: active ? 1 : 0.5, flexShrink: 0 }}>
                  {mod.icon}
                </span>
                {mod.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${C.divider}`,
        flexShrink: 0,
      }}>
        {/* UF indicator */}
        <div style={{
          marginBottom: 10,
          padding: '8px 10px',
          borderRadius: 7,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${C.divider}`,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: C.muted, marginBottom: 3,
          }}>
            UF Hoy
          </div>
          {uf ? (
            <>
              <div style={{
                fontSize: 14, fontWeight: 700, color: C.text,
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>
                $ {Math.round(uf.value).toLocaleString('es-CL')}
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 3, opacity: 0.7 }}>
                {uf.date ? uf.date.split('-').reverse().join('/') : ''}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: C.muted, opacity: 0.5 }}>cargando…</div>
          )}
        </div>

        <div style={{ color: C.muted, fontSize: 10 }}>Q4 Ingenieros SpA · v1.0</div>
        <div style={{ color: '#3A4A60', fontSize: 10, marginTop: 2 }}>77.505.289-9</div>
      </div>
    </aside>
  )
}
