/**
 * prepare-icons.mjs
 * Converts the Q4 logo (JPEG) to PNG + ICO needed for the Windows installer.
 * Runs automatically before every build via "npm run icons".
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require     = createRequire(import.meta.url)
const __dirname   = dirname(fileURLToPath(import.meta.url))
const buildDir    = join(__dirname, '..', 'build')
const srcLogo     = join(__dirname, '..', '..', 'public', 'logo.jpeg')

// ── 1. Ensure build/ exists ───────────────────────────────────────────────────
if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true })

// ── 2. Convert JPEG → PNG using jimp (CJS import) ────────────────────────────
const Jimp   = require('jimp')
const dstPng = join(buildDir, 'icon.png')

const img = await Jimp.read(srcLogo)
img.resize(256, 256)
await img.writeAsync(dstPng)
console.log('✅ build/icon.png — OK (256×256)')

// ── 3. Convert PNG → ICO ──────────────────────────────────────────────────────
const { default: pngToIco } = await import('png-to-ico')

const pngBuf = readFileSync(dstPng)
const icoBuf = await pngToIco([pngBuf])
writeFileSync(join(buildDir, 'icon.ico'), icoBuf)
console.log('✅ build/icon.ico — OK')
