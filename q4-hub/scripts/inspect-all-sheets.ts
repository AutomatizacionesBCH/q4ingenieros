import * as XLSX from 'xlsx'

const FILE = 'c:/Users/alcha/OneDrive/Desktop/Proyectos IA/Proyecto Q4 Completo/1. Flujo 2024 - 2026 (18-05-2026).xlsx'

const wb = XLSX.readFile(FILE, { cellDates: true })

const ALREADY_MIGRATED = new Set(['BD', 'Centros de Costos', 'Cuenta y Categoria'])

for (const sheetName of wb.SheetNames) {
  const sh = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sh, { defval: null })
  const flag = ALREADY_MIGRATED.has(sheetName) ? '✅ MIGRADA' : '❓ NO MIGRADA'

  console.log(`\n${'═'.repeat(70)}`)
  console.log(`${flag}  →  "${sheetName}"  (${rows.length} filas)`)
  console.log('═'.repeat(70))

  if (rows.length === 0) {
    console.log('  (hoja vacía)')
    continue
  }

  const cols = Object.keys(rows[0])
  console.log('Columnas (' + cols.length + '):')
  console.log('  ' + cols.join(' | '))

  console.log('\nPrimeras 3 filas:')
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const r = rows[i]
    const compact = Object.entries(r)
      .filter(([, v]) => v != null && v !== '')
      .slice(0, 6)
      .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
      .join(' | ')
    console.log(`  [${i + 1}] ${compact}`)
  }
}
