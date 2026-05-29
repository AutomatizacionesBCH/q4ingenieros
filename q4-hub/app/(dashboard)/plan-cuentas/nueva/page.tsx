export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { CuentaForm } from '@/components/maestros/CuentaForm'

export default function NuevaCuentaPage() {
  return (
    <div className="q4-page" style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/plan-cuentas" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>
          ← Plan de Cuentas
        </Link>
        <h1 className="q4-h1" style={{ color: '#0F1A2E', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Nueva cuenta
        </h1>
      </div>

      <CuentaForm mode="create" />
    </div>
  )
}
