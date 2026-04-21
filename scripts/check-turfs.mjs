const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});
async function main() {
  const turfs = await prisma.turf.findMany({ select: { id: true, name: true, status: true } });
  console.log('TURFS:', JSON.stringify(turfs));
  const slots = await prisma.slot.findMany({ select: { id: true, turfId: true, startTime: true, endTime: true, status: true, days: true }, take: 5 });
  console.log('SLOTS:', JSON.stringify(slots));
}
main().catch(e => console.error('ERR:', e.message)).finally(() => prisma.$disconnect());
