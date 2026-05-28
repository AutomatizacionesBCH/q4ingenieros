import { Sidebar } from '@/components/Sidebar'
import { LayoutShell } from '@/components/LayoutShell'
import { EmpresaProvider } from '@/hooks/useEmpresa'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmpresaProvider>
      <Sidebar />
      <LayoutShell>{children}</LayoutShell>
    </EmpresaProvider>
  )
}
