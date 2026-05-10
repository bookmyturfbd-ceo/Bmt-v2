import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const p1 = await prisma.player.findUnique({
      where: { id: 'cmnw1gsmq000gichw4dq4d0y7' },
      select: { id: true }
    });
    console.log("Player ID exists:", p1);

    const p2 = await prisma.player.findUnique({
      where: { id: 'cmnw1gsmq000gichw4dq4d0y7' },
      select: {
        teamMemberships: {
          include: { team: { include: { challengeSubscription: true } } },
        }
      }
    });
    console.log("Player full query:", JSON.stringify(p2, null, 2));
  } catch (e) {
    console.error("Prisma Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
