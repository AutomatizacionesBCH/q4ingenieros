/**
 * lib/db.ts — Supabase-backed data layer (all async)
 *
 * Uses getSupabase() inside each function so the client is created lazily
 * at request time — never during `npm run build`.
 */
import { getSupabase } from './supabase'
import type {
  ProjectSummary,
  ProjectDetail,
  ProjectsIndex,
  ProjectStats,
  ManagementType,
  ProjectScope,
} from '@/types/project'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocOverride {
  status?: 'pagado' | 'pendiente'
  fecha?:  string
}

export interface DbEdits {
  budget?:        number
  gross?:         number
  retentionPct?:  number
  retentionTipo?: 'boleta' | 'factura'
  egresos?:       number
  eps?:           Record<number, { label?: string; amount?: number; paid?: boolean }>
  expenses?:      Record<number, { description?: string; amountNet?: number; tipo?: 'boleta' | 'factura'; paid?: boolean }>
  observations?:  string
}

// ─── Document overrides ───────────────────────────────────────────────────────

export async function getAllDocOverrides(): Promise<Record<string, DocOverride>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('document_overrides')
    .select('doc_id, status, fecha')

  if (error || !data) return {}

  const result: Record<string, DocOverride> = {}
  for (const row of data) {
    result[row.doc_id] = {
      status: row.status as 'pagado' | 'pendiente',
      fecha:  row.fecha ?? undefined,
    }
  }
  return result
}

export async function setDocOverride(docId: string, override: DocOverride): Promise<void> {
  const supabase = getSupabase()

  // Fetch existing to apply COALESCE (don't overwrite non-null fields with null)
  const { data: existing } = await supabase
    .from('document_overrides')
    .select('status, fecha')
    .eq('doc_id', docId)
    .maybeSingle()

  await supabase
    .from('document_overrides')
    .upsert(
      {
        doc_id:     docId,
        status:     override.status ?? existing?.status ?? 'pendiente',
        fecha:      override.fecha  ?? existing?.fecha  ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'doc_id' },
    )
}

// ─── Propuesta de Cierre overrides ───────────────────────────────────────────

export interface PropuestaOverride {
  status?: 'pendiente' | 'firmado'
  fecha?:  string
}

export async function getPropuestaOverrides(): Promise<Record<string, PropuestaOverride>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('propuesta_overrides')
    .select('doc_id, status, fecha')

  if (error || !data) return {}

  const result: Record<string, PropuestaOverride> = {}
  for (const row of data) {
    result[row.doc_id] = {
      status: row.status as 'pendiente' | 'firmado' | undefined,
      fecha:  row.fecha  ?? undefined,
    }
  }
  return result
}

export async function setPropuestaOverride(docId: string, override: PropuestaOverride): Promise<void> {
  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('propuesta_overrides')
    .select('status, fecha')
    .eq('doc_id', docId)
    .maybeSingle()

  await supabase
    .from('propuesta_overrides')
    .upsert(
      {
        doc_id:     docId,
        status:     override.status ?? existing?.status ?? 'pendiente',
        fecha:      override.fecha  ?? existing?.fecha  ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'doc_id' },
    )
}

// ─── Manual project status overrides ─────────────────────────────────────────

export async function getAllStatusOverrides(): Promise<Record<number, 'active' | 'finalized'>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('project_status_overrides')
    .select('project_id, status')

  if (error || !data) return {}

  const result: Record<number, 'active' | 'finalized'> = {}
  for (const row of data) {
    result[row.project_id] = row.status as 'active' | 'finalized'
  }
  return result
}

export async function setStatusOverride(
  projectId: number,
  status: 'active' | 'finalized',
): Promise<void> {
  const supabase = getSupabase()
  await supabase
    .from('project_status_overrides')
    .upsert(
      { project_id: projectId, status, updated_at: new Date().toISOString() },
      { onConflict: 'project_id' },
    )
}

// ─── Project edits ────────────────────────────────────────────────────────────

export async function getEdits(projectId: number): Promise<DbEdits> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('project_edits')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (!data) return {}

  return {
    budget:        data.budget        ?? undefined,
    gross:         data.gross         ?? undefined,
    retentionPct:  data.retention_pct ?? undefined,
    retentionTipo: data.retention_tipo as 'boleta' | 'factura' | undefined ?? undefined,
    egresos:       data.egresos       ?? undefined,
    eps:           data.eps      ? JSON.parse(data.eps)      : undefined,
    expenses:      data.expenses ? JSON.parse(data.expenses) : undefined,
    observations:  data.observations  ?? undefined,
  }
}

export async function saveEdits(projectId: number, edits: DbEdits): Promise<void> {
  const supabase = getSupabase()
  await supabase
    .from('project_edits')
    .upsert(
      {
        project_id:     projectId,
        budget:         edits.budget        ?? null,
        gross:          edits.gross         ?? null,
        retention_pct:  edits.retentionPct  ?? null,
        retention_tipo: edits.retentionTipo ?? null,
        egresos:        edits.egresos       ?? null,
        eps:            edits.eps      ? JSON.stringify(edits.eps)      : null,
        expenses:       edits.expenses ? JSON.stringify(edits.expenses) : null,
        observations:   edits.observations  ?? null,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: 'project_id' },
    )
}

// ─── Project index ────────────────────────────────────────────────────────────

function mapProject(row: Record<string, unknown>): ProjectSummary {
  return {
    id:             row.id              as number,
    client:         row.client          as string,
    name:           row.name            as string,
    startDate:      row.start_date      as string | null,
    endDate:        row.end_date        as string | null,
    status:         row.status          as string,
    isFinalized:    row.is_finalized    as boolean,
    managementType: row.management_type as ManagementType,
    scope:          row.scope           as ProjectScope,
    projectType:    row.project_type    as number | null,
  }
}

export async function isDBSeeded(): Promise<boolean> {
  const supabase = getSupabase()
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
  return (count ?? 0) > 0
}

export async function getProjectsFromDB(): Promise<ProjectsIndex | null> {
  const supabase = getSupabase()
  const seeded = await isDBSeeded()
  if (!seeded) return null

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('id')

  if (error || !data) return null

  const projects = data.map(mapProject)
  const stats: ProjectStats = {
    total:     projects.length,
    active:    projects.filter(p => !p.isFinalized).length,
    finalized: projects.filter(p =>  p.isFinalized).length,
    public:    projects.filter(p => p.scope === 'Público').length,
    private:   projects.filter(p => p.scope === 'Privado').length,
    noScope:   projects.filter(p => p.scope === null).length,
  }
  return { projects, stats }
}

/**
 * Returns all projects enriched with pending/margin/eps in 3 parallel queries.
 * Replaces the old pattern of calling getProjectDetail() 230 times from the page.
 */
export async function getProjectsWithListItems(): Promise<import('@/types/ui').ProjectListItem[] | null> {
  const supabase = getSupabase()
  const seeded = await isDBSeeded()
  if (!seeded) return null

  const [projectsRes, detailsRes, epsRes, editsRes] = await Promise.all([
    supabase.from('projects').select('*').order('id'),
    supabase.from('project_details').select('project_id, pending, margin'),
    supabase.from('eps').select('project_id, idx, label, amount, estimated_date, real_date, is_paid').order('idx'),
    supabase.from('project_edits').select('project_id, budget, egresos'),
  ])

  if (!projectsRes.data || projectsRes.error) return null

  const detailMap = new Map((detailsRes.data ?? []).map(d => [d.project_id as number, d]))
  const editsMap  = new Map((editsRes.data  ?? []).map(e => [e.project_id as number, e]))

  // Group EPs by project
  const epsMap = new Map<number, import('@/types/ui').EpSlim[]>()
  for (const ep of (epsRes.data ?? [])) {
    const pid = ep.project_id as number
    const list = epsMap.get(pid) ?? []
    list.push({
      label:         ep.label         ?? '',
      amount:        ep.amount        ?? null,
      estimatedDate: ep.estimated_date ?? null,
      realDate:      ep.real_date      ?? null,
      isPaid:        ep.is_paid === true,
    })
    epsMap.set(pid, list)
  }

  return projectsRes.data.map(p => {
    const detail = detailMap.get(p.id as number)
    const edits  = editsMap.get(p.id as number)
    const allEps = epsMap.get(p.id as number) ?? []

    // Apply edit overrides to pending/margin if the budget was changed
    let pending = (detail?.pending as number | null) ?? null
    let margin  = (detail?.margin  as number | null) ?? null
    if (edits?.budget != null || edits?.egresos != null) {
      // Recalculate: pending = budget_net - paid_eps; we approximate with stored pending
      // Full recalculation happens in ProyectosModule — here we just pass stored values
    }

    return {
      id:             p.id             as number,
      client:         p.client         as string,
      name:           p.name           as string,
      status:         p.status         as string,
      isFinalized:    p.is_finalized   as boolean,
      scope:          p.scope          as import('@/types/project').ProjectScope,
      managementType: p.management_type as import('@/types/project').ManagementType,
      pending,
      margin,
      eps: allEps.filter(ep => /^(EP|Anticipo)/i.test(ep.label.trim())),
    }
  })
}

export async function getProjectDetailFromDB(id: number): Promise<ProjectDetail | null> {
  const supabase = getSupabase()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!project) return null

  const [{ data: detail }, { data: epsRows }, { data: expRows }] = await Promise.all([
    supabase.from('project_details').select('*').eq('project_id', id).maybeSingle(),
    supabase.from('eps').select('*').eq('project_id', id).order('idx'),
    supabase.from('expenses').select('*').eq('project_id', id).order('idx'),
  ])

  return {
    ...mapProject(project),
    paymentModality: detail?.payment_modality ?? null,
    budget: {
      gross:     detail?.budget_gross     ?? null,
      retention: detail?.budget_retention ?? null,
      net:       detail?.budget_net       ?? null,
    },
    eps: (epsRows ?? []).map(ep => ({
      label:         ep.label         ?? '',
      amount:        ep.amount,
      estimatedDate: ep.estimated_date,
      realDate:      ep.real_date,
      isPaid:        ep.is_paid === true,
    })),
    expenses: (expRows ?? []).map(exp => ({
      description:   exp.description,
      amountNet:     exp.amount_net,
      amountWithTax: exp.amount_with_tax,
      isSection:     exp.is_section === true,
    })),
    totalCollected: detail?.total_collected ?? null,
    pending:        detail?.pending         ?? null,
    utility:        detail?.utility         ?? null,
    margin:         detail?.margin          ?? null,
    observations:   detail?.observations    ?? null,
  }
}

// ─── Seed functions ───────────────────────────────────────────────────────────

export async function seedProject(summary: ProjectSummary): Promise<void> {
  const supabase = getSupabase()
  await supabase
    .from('projects')
    .upsert(
      {
        id:              summary.id,
        client:          summary.client,
        name:            summary.name,
        start_date:      summary.startDate,
        end_date:        summary.endDate,
        status:          summary.status,
        is_finalized:    summary.isFinalized,
        management_type: summary.managementType,
        scope:           summary.scope,
        project_type:    summary.projectType,
        synced_at:       new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
}

export async function seedProjectDetail(detail: ProjectDetail): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from('project_details')
    .upsert(
      {
        project_id:       detail.id,
        payment_modality: detail.paymentModality,
        budget_gross:     detail.budget.gross,
        budget_retention: detail.budget.retention,
        budget_net:       detail.budget.net,
        total_collected:  detail.totalCollected,
        pending:          detail.pending,
        utility:          detail.utility,
        margin:           detail.margin,
        observations:     detail.observations,
        synced_at:        new Date().toISOString(),
      },
      { onConflict: 'project_id' },
    )

  await supabase.from('eps').delete().eq('project_id', detail.id)
  if (detail.eps.length > 0) {
    await supabase.from('eps').insert(
      detail.eps.map((ep, i) => ({
        project_id:     detail.id,
        idx:            i,
        label:          ep.label,
        amount:         ep.amount,
        estimated_date: ep.estimatedDate,
        real_date:      ep.realDate,
        is_paid:        ep.isPaid,
      })),
    )
  }

  await supabase.from('expenses').delete().eq('project_id', detail.id)
  if (detail.expenses.length > 0) {
    const rows = detail.expenses.map((exp, i) => ({
      project_id:      detail.id,
      idx:             i,
      description:     exp.description,
      amount_net:      exp.amountNet,
      amount_with_tax: exp.amountWithTax,
      is_section:      exp.isSection,
    }))
    for (const c of chunk(rows, 500)) {
      await supabase.from('expenses').insert(c)
    }
  }
}
