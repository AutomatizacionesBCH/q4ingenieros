export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ProveedorForm } from '@/components/maestros/ProveedorForm'

export default function NuevoProveedorPage() {
  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/proveedores" style={{ color: '#8A9BB8', fontSize: 12, textDecoration: 'none' }}>
          ← Proveedores
        </Link>
        <h1 style={{ color: '#F0EDE8', fontSize: 22, fontWeight: 700, margin: '8px 0 0 0' }}>
          Nuevo proveedor
        </h1>
      </div>
      <ProveedorForm mode="create" />
    </div>
  )
}
