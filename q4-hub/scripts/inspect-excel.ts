import * as XLSX from 'xlsx'

const FILE = 'c:/Users/alcha/OneDrive/Desktop/Proyectos IA/Proyecto Q4 Completo/1. Flujo 2024 - 2026 (18-05-2026).xlsx'

const wb = XLSX.readFile(FILE, { cellDates: true })

for (const sheetName of ['Centros de Costos', 'Cuenta y Categoria', 'Cuenta y Categoría', 'BD']) {
  const sh = wb.Sheets[sheetName]
  if (!sh) {
    console.log(`\n❌ ${sheetName} NO EXISTE`)
    continue
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sh, { defval: null })
  console.log(`\n=== ${sheetName} (${rows.length} filas) ===`)
  if (rows.length > 0) {
    console.log('Columnas:', Object.keys(rows[0]).join(' | '))
    console.log('Primera fila:', JSON.stringify(rows[0], null, 2).slice(0, 600))
    if (rows.length > 1) {
      console.log('Segunda fila:', JSON.stringify(rows[1], null, 2).slice(0, 400))
    }
  }
}

console.log('\nTodas las hojas:', wb.SheetNames.join(' | '))
