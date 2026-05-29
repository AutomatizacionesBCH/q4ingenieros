/**
 * Agrega clases responsive a las páginas restantes
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

const files = walk('app/(dashboard)', '.tsx')

let changed = 0
for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  const original = content

  // Solo modificar page.tsx
  if (!file.endsWith('page.tsx')) continue

  // 1. Padding root div → q4-page (si no tiene ya className)
  content = content.replace(
    /<div style={{ padding: (28|32)( |,|\s)/g,
    '<div className="q4-page" style={{ padding: $1$2'
  )

  // 2. h1 con fontSize 22 → q4-h1
  content = content.replace(
    /<h1 style={{ color: ('#[0-9A-F]+'|T\.textPrimary), fontSize: 22, fontWeight: 700/g,
    '<h1 className="q4-h1" style={{ color: $1, fontSize: 22, fontWeight: 700'
  )

  // 3. Grids con 3-4 columnas → q4-kpi-grid
  content = content.replace(
    /<div style={{ display: 'grid', gridTemplateColumns: 'repeat\(3, 1fr\)'/g,
    '<div className="q4-kpi-grid q4-kpi-grid-3" style={{ display: \'grid\', gridTemplateColumns: \'repeat(3, 1fr)\''
  )
  content = content.replace(
    /<div style={{ display: 'grid', gridTemplateColumns: 'repeat\(4, 1fr\)'/g,
    '<div className="q4-kpi-grid" style={{ display: \'grid\', gridTemplateColumns: \'repeat(4, 1fr)\''
  )
  content = content.replace(
    /<div style={{ display: 'grid', gridTemplateColumns: 'repeat\(5, 1fr\)'/g,
    '<div className="q4-kpi-grid" style={{ display: \'grid\', gridTemplateColumns: \'repeat(5, 1fr)\''
  )

  // 4. Tablas con overflow auto → q4-table-wrap + q4-scroll-touch
  content = content.replace(
    /<div style={{\s*background: ('#[0-9A-F]+'|T\.card), borderRadius: 12, border: `1px solid \$\{T\.border\}`, overflow: 'auto'/g,
    '<div className="q4-table-wrap q4-scroll-touch" style={{ background: $1, borderRadius: 12, border: `1px solid ${T.border}`, overflow: \'auto\''
  )

  if (content !== original) {
    writeFileSync(file, content)
    changed++
    console.log('✓', file.replace(/\\/g, '/'))
  }
}

console.log(`\n${changed} archivos modificados`)
