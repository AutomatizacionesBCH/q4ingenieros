# validate-deploy.ps1 — Correr antes de cada deploy a Easypanel
# Uso: cd q4-hub; .\validate-deploy.ps1

$errors = 0
$warnings = 0

function OK($msg)   { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function FAIL($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red;    $script:errors++ }
function WARN($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow; $script:warnings++ }

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Q4 Hub — Validacion pre-deploy" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Archivos de entorno ───────────────────────────────────────
Write-Host "1. Archivos de entorno"
if (Test-Path ".env")       { OK ".env existe" }         else { FAIL ".env NO existe — Prisma no puede conectar" }
if (Test-Path ".env.local") { OK ".env.local existe" }   else { FAIL ".env.local NO existe — Supabase keys faltantes" }

# ── 2. Dockerfile ────────────────────────────────────────────────
Write-Host ""
Write-Host "2. Dockerfile"
$df = Get-Content "Dockerfile" -Raw -ErrorAction SilentlyContinue
if (!$df) { FAIL "Dockerfile no encontrado"; $df = "" }

if ($df -match "HOSTNAME=0\.0\.0\.0")                    { OK "HOSTNAME=0.0.0.0" }          else { FAIL "HOSTNAME=0.0.0.0 falta — app no sera accesible" }
if ($df -match "PRISMA_QUERY_ENGINE_LIBRARY")             { OK "PRISMA_QUERY_ENGINE_LIBRARY forzado" } else { FAIL "PRISMA_QUERY_ENGINE_LIBRARY falta — Prisma usara binario incorrecto" }
if ($df -match "linux-musl-openssl-3.0.x")               { OK "grep linux-musl-openssl-3.0.x en Dockerfile" } else { WARN "linux-musl-openssl-3.0.x no aparece en Dockerfile" }
if ($df -match "apk add.*openssl")                        { OK "openssl instalado en runner" } else { WARN "openssl no se instala en runner — puede fallar" }
if ($df -match "npm ci" -and $df -notmatch "\-\-only=production") { OK "npm ci (todas las deps incluidas)" } else { WARN "Revisar npm install flags" }
if ($df -match "NEXT_PUBLIC_SUPABASE_URL.*ARG|ARG.*NEXT_PUBLIC_SUPABASE_URL") { OK "NEXT_PUBLIC vars como ARG en builder" } else { FAIL "NEXT_PUBLIC vars no estan como ARG — login quedara pegado" }

# ── 3. schema.prisma ─────────────────────────────────────────────
Write-Host ""
Write-Host "3. Prisma schema"
$schema = Get-Content "prisma/schema.prisma" -Raw -ErrorAction SilentlyContinue
if (!$schema) { FAIL "prisma/schema.prisma no encontrado"; $schema = "" }

if ($schema -match "linux-musl-openssl-3\.0\.x") { OK "binaryTargets incluye linux-musl-openssl-3.0.x" } else { FAIL "binaryTargets NO incluye linux-musl-openssl-3.0.x" }
if ($schema -match "directUrl")                   { OK "directUrl configurado" }          else { WARN "directUrl falta en datasource" }

# ── 4. next.config ────────────────────────────────────────────────
Write-Host ""
Write-Host "4. Next.js config"
$nc = Get-Content "next.config.ts" -Raw -ErrorAction SilentlyContinue
if (!$nc) { $nc = Get-Content "next.config.js" -Raw -ErrorAction SilentlyContinue }
if ($nc -match "standalone") { OK "output: standalone" } else { FAIL "output standalone falta — Docker no funcionara" }

# ── 5. proxy.ts (middleware Next.js 16) ──────────────────────────
Write-Host ""
Write-Host "5. Auth middleware"
if (Test-Path "proxy.ts") { OK "proxy.ts existe" } else { FAIL "proxy.ts NO existe — rutas no protegidas" }
if (Test-Path "middleware.ts") { WARN "middleware.ts existe junto a proxy.ts — puede causar conflictos en Next.js 16" }

# ── 6. Pages con force-dynamic ────────────────────────────────────
Write-Host ""
Write-Host "6. Dashboard pages (force-dynamic)"
$pages = Get-ChildItem "app/(dashboard)" -Recurse -Filter "page.tsx" -ErrorAction SilentlyContinue
$missingDynamic = @()
foreach ($p in $pages) {
    $content = Get-Content $p.FullName -Raw
    if ($content -notmatch "force-dynamic") { $missingDynamic += $p.Name }
}
if ($missingDynamic.Count -eq 0) { OK "Todas las dashboard pages tienen force-dynamic" }
else { WARN "Pages sin force-dynamic: $($missingDynamic -join ', ')" }

# ── 7. TypeScript ─────────────────────────────────────────────────
Write-Host ""
Write-Host "7. TypeScript"
$tscResult = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) { OK "TypeScript sin errores" }
else {
    FAIL "TypeScript tiene errores:"
    $tscResult | Select-Object -First 10 | ForEach-Object { Write-Host "       $_" -ForegroundColor Red }
}

# ── 8. Secrets no commiteados ────────────────────────────────────
Write-Host ""
Write-Host "8. Seguridad (secrets)"
$gitignore = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
if ($gitignore -match "\.env") { OK ".env en .gitignore" } else { FAIL ".env NO esta en .gitignore — riesgo de exponer credenciales" }

# ── Resumen ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "  LISTO PARA DEPLOY ($warnings advertencias)" -ForegroundColor Green
} elseif ($errors -eq 0) {
    Write-Host "  PUEDE DEPLOYAR con $warnings advertencia(s)" -ForegroundColor Yellow
} else {
    Write-Host "  NO DEPLOYAR — $errors error(es), $warnings advertencia(s)" -ForegroundColor Red
    Write-Host "  Corrige los errores antes de hacer deploy" -ForegroundColor Red
}
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
