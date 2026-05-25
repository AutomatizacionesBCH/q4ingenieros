/**
 * app/proyectos/page.tsx — Project list (Server Component)
 *
 * Loads all project data from Supabase in 3 parallel queries (projects +
 * project_details + eps). No Excel reads at runtime.
 */
import { getProjectsWithListItems } from '@/lib/db'
import { ProyectosModule } from '@/components/ProyectosModule'

export default async function ProyectosPage() {
  const listItems = await getProjectsWithListItems()

  if (!listItems) {
    return (
      <div style={{ padding: 40, color: '#64748B', fontFamily: 'sans-serif' }}>
        <h2>Base de datos no inicializada</h2>
        <p>Llama a <code>/api/admin/seed</code> para importar los datos del Excel a Supabase.</p>
      </div>
    )
  }

  return <ProyectosModule projects={listItems} />
}
