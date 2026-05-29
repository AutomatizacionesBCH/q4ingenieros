export function formatCLP(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$ ' + Math.round(n).toLocaleString('es-CL')
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Best-effort fecha visible: paymentDate (real) > docDueDate (estimada) > docIssueDate > createdAt.
 * Devuelve { date, kind } para que la UI muestre el tipo si quiere.
 */
export function bestDate(tx: {
  paymentDate?: Date | string | null
  docDueDate?: Date | string | null
  docIssueDate?: Date | string | null
  createdAt?: Date | string | null
}): { date: Date | string; kind: 'pago' | 'vence' | 'emisión' | 'creada' } | null {
  if (tx.paymentDate) return { date: tx.paymentDate, kind: 'pago' }
  if (tx.docDueDate) return { date: tx.docDueDate, kind: 'vence' }
  if (tx.docIssueDate) return { date: tx.docIssueDate, kind: 'emisión' }
  if (tx.createdAt) return { date: tx.createdAt, kind: 'creada' }
  return null
}

export function parseRUT(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '').trim()
}
