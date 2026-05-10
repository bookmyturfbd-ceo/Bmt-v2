const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.turf.findMany({ select: { id: true, name: true, status: true } })
  .then(turfs => { console.log('TURFS:' + JSON.stringify(turfs)); })
  .then(() => p.slot.findMany({ select: { id: true, status: true, days: true }, take: 3 }))
  .then(slots => { console.log('SLOTS:' + JSON.stringify(slots)); })
  .finally(() => p.$disconnect());
