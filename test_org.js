const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const org = await prisma.organizer.findUnique({ where: { email: 'o2@bmt.com' } });
  console.log(org);
}
main().finally(() => prisma['$disconnect']());
