'use client'

import Link from 'next/link'
import { useIsMobile } from '@/hooks/useIsMobile'

const C = {
  canvas:  '#F0F2F6',
  card:    '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F1A2E',
  textMt:  '#94A3B8',
  orange:  '#E5501E',
  shadow:  '0 2px 10px rgba(0,0,0,0.07)',
} as const

const REPORTS = [
  { href: '/reportes/avance-semanal', label: 'Avance Semanal Proyectos', desc: 'Seguimiento semanal de ingreso, revisión y estado de proyectos, por mes.', icon: '▦' },
]

export default function ReportesPage() {
  const isMobile = useIsMobile()

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: C.canvas }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 12px 32px' : '24px 24px 48px' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Reportería</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMt }}>Reportes operativos de Q4 Ingenieros</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {REPORTS.map(r => (
            <Link key={r.href} href={r.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: C.card, borderRadius: 14, boxShadow: C.shadow, border: `1px solid ${C.border}`,
                padding: '20px 20px', height: '100%', transition: 'border-color 0.15s',
              }}>
                <span style={{ fontSize: 26, color: C.orange, display: 'block', marginBottom: 10 }}>{r.icon}</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: C.textMt, lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
