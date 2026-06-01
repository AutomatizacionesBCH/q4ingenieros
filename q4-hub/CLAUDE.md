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
- Móvil: bottom nav + drawer + cards en vez de tabla para módulos principales

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
