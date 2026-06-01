@AGENTS.md

# Q4 Hub — Contexto para Claude

## Nombre correcto de las empresas
- **Nobarzo SpA** (antes Nobarso / Novarso — ya corregido en todo el código)
- **Q4 Ingenieros Limitada** (RUT 77.505.289-9)
- Estas son las únicas dos empresas del sistema. Usar siempre estos nombres exactos.

## Stack
- Next.js 16 App Router + TypeScript + Turbopack
- Supabase PostgreSQL (pooler aws-1-us-east-2) + Prisma v5
- @react-pdf/renderer v4.5.1 para generación de PDFs
- Docker multi-stage Alpine Linux + Easypanel en Hostinger
- GitHub repo: AutomatizacionesBCH/q4ingenieros

## Rutas del proyecto
- Código: `C:\Users\alcha\OneDrive\Desktop\Proyectos IA\Q4 INGENIEROS\q4-dashboard\q4-hub`
- Proyecto general: `C:\Users\alcha\OneDrive\Desktop\Proyectos IA\Proyecto Q4 Completo`

## Deploy
- Hacer siempre `git push origin main` después de cada sesión de cambios.
- Las migraciones Prisma se aplican automáticamente en Easypanel (`prisma migrate deploy`).
- Directorio de migraciones: `prisma/migrations/` — crear subdirectorio con fecha y nombre descriptivo.

## Módulos implementados
- Dashboard, Transacciones, Proyecciones, Facturas Emitidas, Órdenes de Compra
- Propuestas de Cierre, Bancos, Reportes, Centros de Costo, Proveedores, Plan de Cuentas

## PDF generation
- Patrón: API route en `app/api/pdf/[modulo]/[id]/route.ts`
- Componente en `components/pdf/NombrePDF.tsx`
- Usar `renderToBuffer` de `@react-pdf/renderer`
- Logo: leer `public/logo.jpeg` como base64 con `fs.readFileSync`
- OC PDF disponible en `/api/pdf/oc/[id]`
- Propuestas PDF disponible en `/api/pdf/propuesta/[id]`

## Convenciones clave
- `revalidate = 0` en todas las pages (sin SSG)
- Serializar Decimal → Number y Date → ISO string antes de pasar a client components
- Filtros client-side: pasar datos al cliente y filtrar con useMemo (sin extra fetch)
- Filtros server-side (dashboard): vía URL searchParams leídos en el server component
  (NO usar el contexto useEmpresa para filtrar queries — no está cableado server-side)
- Fechas: `paymentDate`/`issueDate`/etc. son `@db.Date` (medianoche UTC). Para bucketing
  por semana/mes usar SIEMPRE getters UTC (Date.UTC / getUTCDate). `formatDate` ya fija
  `timeZone: 'UTC'` para evitar off-by-one y hydration mismatch.
- Charts Recharts: 'use client', alimentados por props computadas en el server (nunca
  self-fetch que ignore los filtros)
- Móvil: bottom nav + drawer + cards en vez de tabla para módulos principales

## Dashboard
- Lógica de datos centralizada en `lib/dashboard-data.ts` (server-only, sin JSX):
  getSaldoDisponible, getPeriodTotals, getProjectedFlow, getPagosSemana,
  getEvolucionSemanal, getEvolucionMensual, getDesglosePorEmpresa, monthBounds, getWeekRange.
- Dinero: NET para P&L/evolución/comparativa; GROSS para caja (pagos, proyección).
  NULO excluido por defecto vía statusWhere().
- Saldo disponible = suma del último BankBalance CONTABLE por (banco, empresa).
- Umbral de alerta de flujo: localStorage key `q4:flujoUmbral` (default 10.000.000),
  hook `components/dashboard/useUmbral.ts`, sincronizado entre chart y panel vía
  evento window `q4-umbral-change`. NO hay tabla de settings (cero migración).
- Nota: `app/(dashboard)/proyecciones/page.tsx` tiene su propio getWeekRange en hora
  LOCAL (bug de TZ latente, mismo patrón que se corrigió en el dashboard) — pendiente.

## Campos OC (PurchaseOrder)
Campos actuales: id, companyId, company, costCenterId, costCenter, providerId, provider,
projectNumber, description, solicitadoPor, gerencia, cotizacionNum, condicionPago,
tipoMoneda (Currency: CLP|UF), total, retencion, status (ACTIVA|CERRADA|CANCELADA), createdAt

## Campos Provider ampliados
name, rut, email, phone, address, city, contactName

## Historial de cambios importantes
- 2026-05-31: Nobarso → Nobarzo en todo el codebase + DB migration
- 2026-05-31: Buscador+filtros en Facturas Emitidas (FacturasFilters.tsx)
- 2026-05-31: Generador PDF Órdenes de Compra (OrdenCompraPDF.tsx + /api/pdf/oc/[id])
- 2026-05-31: Formulario OC ampliado (solicitadoPor, gerencia, cotizacionNum, etc.)
- 2026-06-01: Dashboard rediseñado (consolidado Grupo + por empresa, flujo proyectado
  con alerta de umbral, evolución semanal/mensual, filtros empresa/mes/estado).
  Bucketing de fechas migrado a UTC; formatDate fija timeZone UTC.
