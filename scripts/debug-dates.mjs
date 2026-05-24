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

function extractAllText(filePath) {
  const buf = fs.readFileSync(filePath)
  const rawLatin1 = buf.toString('latin1')
  const texts = []

  // Decompress all FlateDecode streams
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

  texts.push(rawLatin1)
  return texts.join('\n')
}

function findAllDates(text) {
  const found = []

  // DD/MM/YYYY
  for (const m of text.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/g)) {
    const d = parseInt(m[1]), mo = parseInt(m[2])
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      found.push({ idx: m.index, raw: m[0], date: `${m[3]}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
    }
  }

  // DD de MES del YYYY
  for (const m of text.matchAll(/\b(\d{1,2})\s+de\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+)\s+del?\s+(20\d{2})\b/ig)) {
    const mes = MESES[m[2].toLowerCase()]
    if (mes) {
      found.push({ idx: m.index, raw: m[0], date: `${m[3]}-${mes}-${m[1].padStart(2,'0')}` })
    }
  }

  // /CreationDate
  const cd = text.match(/\/CreationDate\s*\(D:(\d{4})(\d{2})(\d{2})/)
  if (cd) found.push({ idx: -1, raw: `CreationDate`, date: `${cd[1]}-${cd[2]}-${cd[3]}` })

  found.sort((a,b) => a.idx - b.idx)
  return found
}

const folders = ['facturas', 'boletas']
for (const folder of folders) {
  const dir = path.join(DOCS_ROOT, folder)
  if (!fs.existsSync(dir)) continue
  const files = fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f))

  for (const file of files) {
    const filePath = path.join(dir, file)
    const text = extractAllText(filePath)
    const dates = findAllDates(text)

    console.log(`\n[${folder}] ${file}`)
    if (dates.length === 0) {
      console.log('  ❌ No dates found')
    } else {
      dates.slice(0, 5).forEach((d, i) => {
        const marker = i === 0 ? '  ✅ FIRST:' : `  ${i+1}.     `
        console.log(`${marker} ${d.date}  (${d.raw.replace(/\n/g,' ')})`)
      })
    }
  }
}
