'use client'
import Link from 'next/link'

export function FAB({ href, label = '+' }: { href: string; label?: string }) {
  return (
    <Link href={href} aria-label="Nueva" style={{
      position: 'fixed',
      right: 18,
      bottom: 'calc(76px + env(safe-area-inset-bottom))',
      width: 56, height: 56,
      borderRadius: 28,
      background: 'linear-gradient(135deg, #E5501E 0%, #F06030 100%)',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, fontWeight: 400,
      textDecoration: 'none',
      boxShadow: '0 6px 16px rgba(229, 80, 30, 0.4), 0 2px 4px rgba(0,0,0,0.1)',
      zIndex: 150,
      transition: 'transform 0.15s, box-shadow 0.15s',
      lineHeight: 1,
    }}>
      <span style={{ marginTop: -2 }}>{label}</span>
    </Link>
  )
}
