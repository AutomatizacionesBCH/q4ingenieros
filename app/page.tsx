/**
 * app/page.tsx — Phase 2: Project list (Server Component)
 *
 * Fetches all project data server-side using the module-level cache.
 * Passes serializable data to ProjectListClient (Client Component).
 */
import { getProjectsIndex, getProjectDetail } from '@/lib/excel-parser'
import { ProjectListClient } from '@/components/ProjectListClient'
import type { ProjectListItem } from '@/types/ui'

export default async function HomePage() {
  const { projects, stats } = getProjectsIndex()

  // Build list items: summary + EP data from detail (module cache)
  const listItems: ProjectListItem[] = projects.map(p => {
    const detail = getProjectDetail(p.id) // null for project 174

    // Filter EPs to only EP/Anticipo items per spec
    const eps =
      detail?.eps.filter(ep => /^(EP|Anticipo)/i.test(ep.label.trim())) ?? []

    return {
      id: p.id,
      client: p.client,
      name: p.name,
      status: p.status,
      isFinalized: p.isFinalized,
      scope: p.scope,
      pending: detail?.pending ?? null,
      margin: detail?.margin ?? null,
      eps,
    }
  })

  return <ProjectListClient projects={listItems} stats={stats} />
}
