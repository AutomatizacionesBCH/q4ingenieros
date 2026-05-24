/**
 * lib/db.ts — Supabase-backed data layer (all async)
 *
 * Replaces better-sqlite3. All functions return Promises.
 * Env vars required: SUPABASE_URL + SUPABASE_SERVICE_KEY
 */
import { supabase } from './supabase'
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
  fecha?:  string   // YYYY-MM-DD
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

// ─── Document overrides (fecha + estado por documento) ───────────────────────

export async function getAllDocOverrides(): Promise<Record<string, DocOverride>> {
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
  // Fetch existing row to apply COALESCE logic (don't overwrite non-null fields with null)
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

// ─── Manual project status overrides ─────────────────────────────────────────

export async function getAllStatusOverrides(): Promise<Record<number, 'active' | 'finalized'>> {
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
  await supabase
    .from('project_status_overrides')
    .upsert(
      { project_id: projectId, status, updated_at: new Date().toISOString() },
      { onConflict: 'project_id' },
    )
}

// ─── Project edits (user overrides: budget, egresos, etc.) ───────────────────

export async function getEdits(projectId: number): Promise<DbEdits> {
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

// ─── Project index (from Resumen sheet) ──────────────────────────────────────

function mapProject(row: Record<string, unknown>): ProjectSummary {
  return {
    id:             row.id             as number,
    client:         row.client         as string,
    name:           row.name           as string,
    startDate:      row.start_date     as string | null,
    endDate:        row.end_date       as string | null,
    status:         row.status         as string,
    isFinalized:    row.is_finalized   as boolean,
    managementType: row.management_type as ManagementType,
    scope:          row.scope          as ProjectScope,
    projectType:    row.project_type   as number | null,
  }
}

export async function isDBSeeded(): Promise<boolean> {
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
  return (count ?? 0) > 0
}

export async function getProjectsFromDB(): Promise<ProjectsIndex | null> {
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

export async function getProjectDetailFromDB(id: number): Promise<ProjectDetail | null> {
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

// ─── Seed functions (Excel → Supabase) ───────────────────────────────────────

export async function seedProject(summary: ProjectSummary): Promise<void> {
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
  // 1. Upsert project_details
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

  // 2. Replace EPs (delete + insert)
  await supabase.from('eps').delete().eq('project_id', detail.id)
  if (detail.eps.length > 0) {
    const rows = detail.eps.map((ep, i) => ({
      project_id:     detail.id,
      idx:            i,
      label:          ep.label,
      amount:         ep.amount,
      estimated_date: ep.estimatedDate,
      real_date:      ep.realDate,
      is_paid:        ep.isPaid,
    }))
    await supabase.from('eps').insert(rows)
  }

  // 3. Replace expenses (delete + insert)
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
    // Insert in chunks of 500 to stay within Supabase row limits
    for (const c of chunk(rows, 500)) {
      await supabase.from('expenses').insert(c)
    }
  }
}
