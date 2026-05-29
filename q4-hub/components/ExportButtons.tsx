'use client'
import { useSearchParams } from 'next/navigation'
import { T } from '@/lib/theme'

export function ExportButtons({ tipo }: { tipo: 'transacciones' | 'proyecciones' | 'ceco' }) {
  const params = useSearchParams()

  const buildUrl = (formato: 'pdf' | 'excel') => {
    const p = new URLSearchParams(params.toString())
    p.delete('page')
    p.set('tipo', tipo)
    p.set('formato', formato)
    return `/api/reportes/generar?${p.toString()}`
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <a href={buildUrl('excel')} target="_blank" rel="noopener noreferrer" style={{
        background: T.card, color: T.success, border: `1px solid ${T.successBorder}`,
        borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600,
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>↓ Excel</a>
      <a href={buildUrl('pdf')} target="_blank" rel="noopener noreferrer" style={{
        background: T.card, color: T.orange, border: `1px solid ${T.orangeBorder}`,
        borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600,
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>↓ PDF</a>
    </div>
  )
}
