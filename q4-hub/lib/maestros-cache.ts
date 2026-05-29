/**
 * Cached loaders for maestros que casi nunca cambian.
 * Cada page request comparte la misma respuesta gracias a React cache().
 */
import { cache } from 'react'
import { prisma } from './prisma'

export const getCompanies = cache(async () => {
  return prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
})

export const getCecos = cache(async () => {
  return prisma.costCenter.findMany({
    select: { id: true, code: true, name: true, companyId: true, projectNumber: true, location: true },
    orderBy: { code: 'asc' },
  })
})

export const getAccounts = cache(async () => {
  return prisma.account.findMany({
    select: {
      id: true, code: true, name: true, movementType: true,
      categories: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
    },
    orderBy: { code: 'asc' },
  })
})

export const getProviders = cache(async () => {
  return prisma.provider.findMany({
    select: { id: true, name: true, rut: true },
    orderBy: { name: 'asc' },
  })
})

export const getActivePurchaseOrders = cache(async () => {
  return prisma.purchaseOrder.findMany({
    where: { status: 'ACTIVA' },
    select: { id: true, description: true, companyId: true, providerId: true, total: true },
    orderBy: { id: 'desc' },
  })
})
