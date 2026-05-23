/**
 * app/control/page.tsx — Control Ingeniería Q4 2026 (Server Component)
 */
import { getControlData } from '@/lib/control-parser'
import { ControlModule } from '@/components/ControlModule'

export default function ControlPage() {
  const data = getControlData()
  return <ControlModule data={data} />
}
