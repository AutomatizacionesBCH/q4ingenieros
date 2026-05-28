import { prisma } from '../lib/prisma'
prisma.transaction.deleteMany({}).then(r => { console.log('Deleted:', r.count); process.exit(0) })
