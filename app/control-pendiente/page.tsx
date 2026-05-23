/**
 * app/control-pendiente/page.tsx — Control Pendiente Histórico (Server Component)
 */
import { getControlData } from '@/lib/control-parser'
import { ControlPendienteModule } from '@/components/ControlPendienteModule'

export default function ControlPendientePage() {
  const data = getControlData()
  return <ControlPendienteModule data={data} />
}
