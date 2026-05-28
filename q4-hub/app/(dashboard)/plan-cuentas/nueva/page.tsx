export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { CuentaForm } from '@/components/maestros/CuentaForm'

export default function NuevaCuentaPage() {
  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/plan-cuentas" style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
          ← Plan de Cuentas
        </Link>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Nueva cuenta
        </h1>
      </div>

      <CuentaForm mode="create" />
    </div>
  )
}
