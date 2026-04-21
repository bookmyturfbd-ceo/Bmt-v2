import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const turfs = await prisma.turf.findMany();
console.log(JSON.stringify(turfs.map(t => ({name: t.name, logoUrl: t.logoUrl, imageUrls: t.imageUrls})), null, 2));
