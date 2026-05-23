/**
 * app/proyectos/page.tsx — Project list (Server Component)
 *
 * Loads all project data server-side using the module-level cache,
 * then passes serializable data to ProyectosModule (Client Component).
 */
import { getProjectsIndex, getProjectDetail } from '@/lib/excel-parser'
import { ProyectosModule } from '@/components/ProyectosModule'
import type { ProjectListItem } from '@/types/ui'

export default function ProyectosPage() {
  const { projects, stats } = getProjectsIndex()

  const listItems: ProjectListItem[] = projects.map(p => {
    const detail = getProjectDetail(p.id) // null for project 174

    const eps =
      detail?.eps.filter(ep => /^(EP|Anticipo)/i.test(ep.label.trim())) ?? []

    return {
      id: p.id,
      client: p.client,
      name: p.name,
      status: p.status,
      isFinalized: p.isFinalized,
      scope: p.scope,
      managementType: p.managementType,
      pending: detail?.pending ?? null,
      margin: detail?.margin ?? null,
      eps,
    }
  })

  return <ProyectosModule projects={listItems} stats={stats} />
}
