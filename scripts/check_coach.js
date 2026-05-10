const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const coach = await prisma.owner.findUnique({
    where: { email: 'coach1@gmail.com' }
  });
  console.log(coach);
}

main().catch(console.error).finally(() => prisma.$disconnect());
