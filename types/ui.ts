import type { ProjectScope } from './project'

/** Serializable shape passed from Server → Client Component */
export interface ProjectListItem {
  id: number
  client: string
  name: string
  status: string
  isFinalized: boolean
  scope: ProjectScope
  pending: number | null
  margin: number | null
  /** Only EP/Anticipo items from the INGRESOS block */
  eps: EpSlim[]
}

export interface EpSlim {
  label: string
  amount: number | null
  estimatedDate: string | null
  realDate: string | null
  isPaid: boolean
}

export type SortField = 'pending' | 'client' | 'status'
export type SortDir = 'asc' | 'desc'
