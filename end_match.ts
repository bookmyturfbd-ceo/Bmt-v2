import 'dotenv/config';
import prisma from './src/lib/prisma.js';

async function main() {
  const activeMatches = await prisma.match.findMany({
    where: {
      status: { in: ['LIVE', 'SCHEDULED'] }
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

    // Mark match completed as draw
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'COMPLETED',
        winnerId: null,
        scoreA: 0,
        scoreB: 0,
        runsA: 0,
        runsB: 0,
        mmrChangeA: 0,
        mmrChangeB: 0,
        finalOutcome: 'agreed',
      }
    });

    console.log(`Match ${match.id} forced completed as draw.`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
