// ─── Domain types for Q4 Ingenieros Dashboard ────────────────────────────────

export type ProjectScope = 'Público' | 'Privado' | null
export type ManagementType = 'm' | 'i' | 'e' | null

// ── Index-level data (from Resumen sheet only) ────────────────────────────────

export interface ProjectSummary {
  id: number
  client: string
  name: string
  startDate: string | null
  endDate: string | null
  /** Raw status string from Resumen col F */
  status: string
  /** true only when status === "Finalizado" */
  isFinalized: boolean
  managementType: ManagementType
  scope: ProjectScope
  projectType: number | null
}

// ── Detail-level data (from individual project sheets) ────────────────────────

export interface EP {
  /** Raw label e.g. "EP N°1", "BH N°76" */
  label: string
  amount: number | null
  estimatedDate: string | null
  realDate: string | null
  /** Inferred: realDate is present = paid */
  isPaid: boolean
}

export interface Expense {
  description: string
  amountNet: number | null
  amountWithTax: number | null
  /** true for subtotal/category-header rows in hierarchical sheets (210+).
   *  e.g. ESTRUCTURAL, ETAPA 1, ARQUITECTURA — not counted in leaf totals. */
  isSection: boolean
}

export interface ProjectBudget {
  gross: number | null
  retention: number | null
  net: number | null
}

export interface ProjectDetail extends ProjectSummary {
  paymentModality: string | null
  budget: ProjectBudget
  eps: EP[]
  expenses: Expense[]
  totalCollected: number | null
  pending: number | null
  utility: number | null
  /** 0–1 ratio. Can be negative (loss). */
  margin: number | null
  observations: string | null
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface ProjectStats {
  total: number
  active: number
  finalized: number
  public: number
  private: number
  noScope: number
}

export interface ProjectsIndex {
  projects: ProjectSummary[]
  stats: ProjectStats
}

/** Validation result for /api/validate */
export interface ValidationResult {
  ok: boolean
  stats: ProjectStats
  expected: ProjectStats
  mismatches: string[]
}
