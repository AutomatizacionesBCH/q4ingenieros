/**
 * Reemplazo masivo de colores dark → light en páginas y componentes.
 * Uso: node scripts/theme-migrate.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function walk(dir, ext) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue
      out.push(...walk(p, ext))
    } else if (name.endsWith(ext)) {
      out.push(p)
    }
  }
  return out
}
function globSync() {
  return [...walk('app', '.tsx'), ...walk('components', '.tsx')]
}

const REPLACEMENTS = [
  // Backgrounds dark → light
  ["'#162138'", "'#FFFFFF'"],        // card
  ['"#162138"', '"#FFFFFF"'],
  ["'#1D2D47'", "'#F8FAFC'"],        // hover/btn secondary
  ['"#1D2D47"', '"#F8FAFC"'],
  ["'#0F1A2E'", "'#F0F2F6'"],        // BUT only when used as page bg — risky
                                      // En general este es el navy, lo mantenemos para textos
                                      // Voy a NO reemplazar este y manejarlo manual

  // Borders semi-transparentes blanco (dark) → border light
  ["'rgba(255,255,255,0.08)'", "'#E2E8F0'"],
  ["'rgba(255,255,255,0.07)'", "'#E2E8F0'"],
  ["'rgba(255,255,255,0.05)'", "'#E2E8F0'"],
  ["'rgba(255,255,255,0.04)'", "'#E2E8F0'"],
  ["'rgba(255,255,255,0.03)'", "'#F8FAFC'"],
  ["'rgba(255,255,255,0.015)'", "'#F8FAFC'"],
  ["'rgba(255,255,255,0.1)'", "'#E2E8F0'"],
  ["'rgba(255,255,255,0.06)'", "'#E2E8F0'"],

  // Textos dark mode → light mode
  ["'#F0EDE8'", "'#0F1A2E'"],   // text primary
  ['"#F0EDE8"', '"#0F1A2E"'],
  ["'#8A9BB8'", "'#475569'"],   // text secondary
  ['"#8A9BB8"', '"#475569"'],
  ["'#5A7090'", "'#94A3B8'"],   // text muted
  ['"#5A7090"', '"#94A3B8"'],
  ["'#E0928B'", "'#DC2626'"],   // light red text in errors

  // Status semantic colors → use theme variants
  ["'#3D8B5E'", "'#16A34A'"],   // success
  ['"#3D8B5E"', '"#16A34A"'],
  ["'#D4A017'", "'#CA8A04'"],   // warning
  ['"#D4A017"', '"#CA8A04"'],
  ["'#C0392B'", "'#DC2626'"],   // danger
  ['"#C0392B"', '"#DC2626"'],

  // Error backgrounds dark → light
  ["'rgba(192,57,43,0.15)'", "'#FEF2F2'"],
  ["'rgba(192,57,43,0.3)'", "'#FECACA'"],
  ["'rgba(61,139,94,0.15)'", "'#F0FDF4'"],
  ["'rgba(61,139,94,0.18)'", "'#F0FDF4'"],
  ["'rgba(61,139,94,0.2)'", "'#F0FDF4'"],
  ["'rgba(61,139,94,0.3)'", "'#BBF7D0'"],
  ["'rgba(61,139,94,0.06)'", "'#F0FDF4'"],
  ["'rgba(212,160,23,0.12)'", "'#FEFCE8'"],
  ["'rgba(212,160,23,0.15)'", "'#FEFCE8'"],
  ["'rgba(212,160,23,0.3)'", "'#FDE68A'"],
  ["'rgba(192,57,43,0.2)'", "'#FECACA'"],
  ["'rgba(90,112,144,0.18)'", "'#F1F5F9'"],
]

const files = globSync()
  .filter(f =>
    !f.includes('Sidebar.tsx') &&
    !f.includes('LayoutShell.tsx') &&
    !f.includes('login') &&
    !f.includes('StatusBadge') &&
    !f.includes('Pagination') &&
    !f.includes('TransaccionesFilters') &&
    !f.includes('ProyeccionesFilters') &&
    !f.includes('PagosProximosWidget') &&
    !f.includes('FlujoCajaChart')
  )

let changed = 0
for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  const original = content
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to)
  }
  // Patrón rgba(229,80,30,X) → mantener orange porque es el accent
  // No tocamos el `#E5501E` orange

  // Reemplazar background hex específicos de fondo dark
  content = content.replace(/background:\s*'#0F1A2E'/g, "background: '#F0F2F6'")
  content = content.replace(/background:\s*"#0F1A2E"/g, 'background: "#F0F2F6"')

  if (content !== original) {
    writeFileSync(file, content)
    changed++
    console.log('✓', file)
  }
}

console.log(`\n${changed} archivos modificados`)
