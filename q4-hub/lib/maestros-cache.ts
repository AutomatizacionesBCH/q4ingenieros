/**
 * Cached loaders para maestros que casi nunca cambian.
 *
 * Usa unstable_cache (Next.js Data Cache) en lugar de React.cache():
 * - React.cache()     → deduplica solo dentro de un único render (mismo request)
 * - unstable_cache()  → persiste en el Data Cache del servidor entre requests/navegaciones
 *
 * TTL: 5 minutos. Se invalida con revalidateTag('maestros') después de mutaciones.
 */
import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

const TAGS = ['maestros']
const REVALIDATE = 300 // 5 minutos

export const getCompanies = unstable_cache(
  async () => prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  }),
  ['maestros-companies'],
  { tags: TAGS, revalidate: REVALIDATE }
)

export const getCecos = unstable_cache(
  async () => prisma.costCenter.findMany({
    select: { id: true, code: true, name: true, companyId: true, projectNumber: true, location: true },
    orderBy: { code: 'asc' },
  }),
  ['maestros-cecos'],
  { tags: TAGS, revalidate: REVALIDATE }
)

export const getAccounts = unstable_cache(
  async () => prisma.account.findMany({
    select: {
      id: true, code: true, name: true, movementType: true,
      categories: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
    },
    orderBy: { code: 'asc' },
  }),
  ['maestros-accounts'],
  { tags: TAGS, revalidate: REVALIDATE }
)

export const getProviders = unstable_cache(
  async () => prisma.provider.findMany({
    select: { id: true, name: true, rut: true },
    orderBy: { name: 'asc' },
  }),
  ['maestros-providers'],
  { tags: TAGS, revalidate: REVALIDATE }
)

export const getActivePurchaseOrders = unstable_cache(
  async () => prisma.purchaseOrder.findMany({
    where: { status: 'ACTIVA' },
    select: { id: true, description: true, companyId: true, providerId: true, total: true },
    orderBy: { id: 'desc' },
  }),
  ['maestros-purchase-orders'],
  { tags: ['maestros', 'purchase-orders'], revalidate: 60 } // OC cambia más seguido → 1 min
)
