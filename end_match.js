const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const activeMatches = await prisma.match.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'UPCOMING'] }
    }
  });

  if (activeMatches.length === 0) {
    console.log("No active matches found to end.");
    return;
  }

  console.log(`Found ${activeMatches.length} active matches. Ending them as draw...`);

  for (const match of activeMatches) {
    // End innings if any
    await prisma.cricketInnings.updateMany({
      where: { matchId: match.id, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });

    // Create match result as draw
    const result = await prisma.matchResult.create({
      data: {
        matchId: match.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        mmrChangeA: 0,
        mmrChangeB: 0,
        teamAScore: 0,
        teamBScore: 0,
      }
    });

    // Mark match completed
    await prisma.match.update({
      where: { id: match.id },
      data: { status: 'COMPLETED' }
    });

    console.log(`Match ${match.id} forced completed as draw.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
