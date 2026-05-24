import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_ROOT = path.join(__dirname, '..', 'public', 'docs')

const MESES = {
  enero:'01',febrero:'02',marzo:'03',abril:'04',
  mayo:'05',junio:'06',julio:'07',agosto:'08',
  septiembre:'09',octubre:'10',noviembre:'11',diciembre:'12',
}

function findFirstDateInText(text) {
  let best = null

  const m1 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/)
  if (m1 && m1.index !== undefined) {
    const d = parseInt(m1[1]), mo = parseInt(m1[2])
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      best = { index: m1.index, date: `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}` }
    }
  }

  const m2 = text.match(/\b(\d{1,2})\s+de\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+)\s+del?\s+(20\d{2})\b/i)
  if (m2 && m2.index !== undefined) {
    const mes = MESES[m2[2].toLowerCase()]
    if (mes && (best === null || m2.index < best.index)) {
      best = { index: m2.index, date: `${m2[3]}-${mes}-${m2[1].padStart(2,'0')}` }
    }
  }

  return best?.date ?? null
}

function extractDateFromPDF(filePath) {
  try {
    const buf = fs.readFileSync(filePath)
    const texts = []
    const STREAM  = Buffer.from('stream')
    const ENDSTRM = Buffer.from('endstream')
    let pos = 0

    while (pos < buf.length) {
      const sIdx = buf.indexOf(STREAM, pos)
      if (sIdx === -1) break
      const afterStream = sIdx + STREAM.length
      let dataStart
      if (buf[afterStream] === 0x0A) {
        dataStart = afterStream + 1
      } else if (buf[afterStream] === 0x0D && buf[afterStream + 1] === 0x0A) {
        dataStart = afterStream + 2
      } else {
        pos = sIdx + 1
        continue
      }
      const eIdx = buf.indexOf(ENDSTRM, dataStart)
      if (eIdx === -1) break
      let dataEnd = eIdx
      if (dataEnd > 0 && buf[dataEnd - 1] === 0x0A) dataEnd--
      if (dataEnd > 0 && buf[dataEnd - 1] === 0x0D) dataEnd--

      if (dataEnd > dataStart + 8) {
        const chunk = buf.slice(dataStart, dataEnd)
        try { texts.push(zlib.inflateSync(chunk).toString('utf8')) } catch {
          try { texts.push(zlib.inflateRawSync(chunk).toString('utf8')) } catch {}
        }
      }
      pos = eIdx + ENDSTRM.length
    }

    if (texts.length > 0) {
      const d = findFirstDateInText(texts.join('\n'))
      if (d) return d
    }

    return findFirstDateInText(buf.toString('latin1'))
  } catch {
    return null
  }
}

const folders = ['facturas', 'boletas']
for (const folder of folders) {
  const dir = path.join(DOCS_ROOT, folder)
  if (!fs.existsSync(dir)) continue
  const files = fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f))

  for (const file of files) {
    const filePath = path.join(dir, file)
    const date = extractDateFromPDF(filePath)
    const marker = date ? '✅' : '❌'
    console.log(`${marker} [${folder}] ${file.replace(/\.pdf$/i,'').substring(0,60)}`)
    if (date) console.log(`   → ${date}`)
  }
}
