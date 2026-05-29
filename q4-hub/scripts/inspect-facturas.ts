import * as XLSX from 'xlsx'

const FILE = 'c:/Users/alcha/OneDrive/Desktop/Proyectos IA/Proyecto Q4 Completo/1. Flujo 2024 - 2026 (18-05-2026).xlsx'

const wb = XLSX.readFile(FILE, { cellDates: true })

// Para "Factura Emitidas" leer como matriz cruda
const sh = wb.Sheets['Factura Emitidas']
const rows = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: null })

console.log(`=== "Factura Emitidas" — ${rows.length} filas (raw matrix) ===\n`)

// Mostrar primeras 25 filas con sus columnas (limitando a 14 col)
for (let i = 0; i < Math.min(25, rows.length); i++) {
  const r = rows[i]
  const cells = r.slice(0, 14).map(c => {
    if (c == null) return '·'
    const s = String(c).slice(0, 18)
    return s
  }).join(' | ')
  console.log(`[${String(i).padStart(3)}] ${cells}`)
}

console.log('\n\n=== "Hoja1" — 54 filas (raw matrix) ===\n')
const sh2 = wb.Sheets['Hoja1']
const rows2 = XLSX.utils.sheet_to_json<unknown[]>(sh2, { header: 1, defval: null })
for (let i = 0; i < Math.min(15, rows2.length); i++) {
  const r = rows2[i]
  const cells = r.slice(0, 14).map(c => {
    if (c == null) return '·'
    return String(c).slice(0, 16)
  }).join(' | ')
  console.log(`[${String(i).padStart(3)}] ${cells}`)
}
