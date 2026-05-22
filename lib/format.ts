/** Formatting utilities — used on both server and client */

export function formatCLP(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return '$ ' + Math.round(amount).toLocaleString('es-CL')
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === '—') return '—'
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/** Returns border/badge color + readable label for a project status string */
export function getStatusStyle(status: string): {
  color: string
  bg: string
  label: string
} {
  if (!status) return { color: '#8A9BB8', bg: 'rgba(138,155,184,0.12)', label: 'Sin estado' }
  if (/finalizado/i.test(status))
    return { color: '#3D8B5E', bg: 'rgba(61,139,94,0.12)', label: 'Finalizado' }
  if (/revisi[oó]n|subsanaci[oó]n/i.test(status))
    return { color: '#D4A017', bg: 'rgba(212,160,23,0.12)', label: status }
  if (/proceso|dise[nñ]o/i.test(status))
    return { color: '#E5501E', bg: 'rgba(229,80,30,0.12)', label: status }
  if (/espera|documentaci[oó]n/i.test(status))
    return { color: '#D4A017', bg: 'rgba(212,160,23,0.12)', label: status }
  return { color: '#8A9BB8', bg: 'rgba(138,155,184,0.12)', label: status }
}

export function sumPending(projects: { pending: number | null }[]): number {
  return projects.reduce((acc, p) => acc + (p.pending ?? 0), 0)
}
