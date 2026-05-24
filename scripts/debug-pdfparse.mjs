import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require   = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const pdfParse = require('pdf-parse')

const BOLETAS = [
  'BH 201 EP Etapa 2, Machali (Hugo Bustos).pdf',
  'Boleta de Honorarios N°189 EP 1 Machali (Hugo Bustos).pdf',
  'Boleta N°197 EP Marzo SMAPA, Maipú.pdf',
]

const MESES = { enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',octubre:'10',noviembre:'11',diciembre:'12' }

function findDate(text) {
  const m1 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/)
  const m2 = text.match(/\b(\d{1,2})\s+de\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+)\s+de(?:l)?\s+(20\d{2})\b/i)

  let best = null
  if (m1) {
    const d = parseInt(m1[1]), mo = parseInt(m1[2])
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      best = { idx: m1.index, date: `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`, raw: m1[0] }
  }
  if (m2) {
    const mes = MESES[m2[2].toLowerCase()]
    if (mes && (!best || m2.index < best.idx))
      best = { idx: m2.index, date: `${m2[3]}-${mes}-${m2[1].padStart(2,'0')}`, raw: m2[0] }
  }
  return best
}

for (const file of BOLETAS) {
  const filePath = join(__dirname, '..', 'public', 'docs', 'boletas', file)
  console.log(`\n📄 ${file}`)
  try {
    const buf  = readFileSync(filePath)
    const data = await pdfParse(buf)
    const text = data.text
    console.log(`   Texto extraído (primeros 300 chars): ${text.slice(0,300).replace(/\n/g,' ')}`)
    const d = findDate(text)
    if (d) console.log(`   ✅ Fecha encontrada: ${d.date} (${d.raw})`)
    else   console.log(`   ❌ Sin fecha`)
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`)
  }
}
