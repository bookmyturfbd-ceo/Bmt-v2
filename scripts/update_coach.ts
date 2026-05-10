import prisma from '../src/lib/prisma';

async function main() {
  const coach = await prisma.owner.update({
    where: { email: 'coach1@gmail.com' },
    data: { isCoach: true }
  });
  console.log('Updated coach1@gmail.com to isCoach = true');
}

main().catch(console.error).finally(() => prisma.$disconnect());
