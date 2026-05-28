export function formatCLP(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$ ' + Math.round(n).toLocaleString('es-CL')
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function parseRUT(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '').trim()
}
