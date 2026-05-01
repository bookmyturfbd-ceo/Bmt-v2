/**
 * Tournament Engine — Advancement & Bracket Progression
 * Handles auto-advancing winners in knockout brackets and seeding from group stages.
 */
import prisma from '@/lib/prisma';
import { generateKnockoutBracket } from './fixture-generator';

/**
 * Called after a knockout match completes.
 * Advances the winner to the next round if applicable.
 */
export async function advanceKnockoutWinner(
  tournamentId: string,
  matchId: string,
  winnerId: string
) {
  // Find the completed match
  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    select: { stage: true, matchNumber: true },
  });

  if (!match) return;

  // Next stage mapping
  const nextStageMap: Record<string, string> = {
    'ROUND_OF_16': 'QUARTER',
    'QUARTER': 'SEMI',
    'SEMI': 'FINAL',
  };

  const nextStage = nextStageMap[match.stage];
  if (!nextStage) return; // Final match, nowhere to advance

  // We need to find the target match in the next round.
  // In a standard binary bracket:
  // Match 1 & 2 feed into NextRound Match 1
  // Match 3 & 4 feed into NextRound Match 2
  // So, relative offset within the current round determines the target match.
  
  // Get all matches in current stage ordered by matchNumber
  const currentStageMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, stage: match.stage },
    orderBy: { matchNumber: 'asc' },
    select: { id: true, matchNumber: true },
  });

  const currentIndex = currentStageMatches.findIndex(m => m.id === matchId);
  if (currentIndex === -1) return;

  const targetIndex = Math.floor(currentIndex / 2);
  const isTeamA = currentIndex % 2 === 0;

  // Get all matches in next stage ordered by matchNumber
  const nextStageMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, stage: nextStage as any },
    orderBy: { matchNumber: 'asc' },
    select: { id: true },
  });

  const targetMatch = nextStageMatches[targetIndex];
  if (!targetMatch) return;

  // Update the target match
  await prisma.tournamentMatch.update({
    where: { id: targetMatch.id },
    data: isTeamA ? { teamAId: winnerId } : { teamBId: winnerId },
  });
}

/**
 * Checks if a group stage is fully complete.
 * If yes, seeds the top N teams into the knockout bracket.
 */
export async function checkAndAdvanceGroupStage(
  tournamentId: string,
  qualifyPerGroup: number
) {
  // Check if ALL group matches in the tournament are completed
  const pendingGroupMatches = await prisma.tournamentMatch.count({
    where: {
      tournamentId,
      groupId: { not: null },
      status: { notIn: ['COMPLETED', 'WALKOVER', 'CANCELLED'] },
    },
  });

  if (pendingGroupMatches > 0) return; // Group stage still active

  // Have we already seeded the knockout bracket? Check if knockout matches exist
  const existingKnockouts = await prisma.tournamentMatch.count({
    where: { tournamentId, groupId: null },
  });

  if (existingKnockouts > 0) return; // Already seeded

  // Group stage is complete! Fetch final standings.
  const standings = await prisma.tournamentStanding.findMany({
    where: { tournamentId },
    orderBy: [
      { groupId: 'asc' },
      { position: 'asc' },
    ],
  });

  // Extract qualifiers
  const groups = Array.from(new Set(standings.filter(s => s.groupId).map(s => s.groupId!)));
  const qualifiers: string[] = [];

  for (const groupId of groups) {
    const groupStandings = standings.filter(s => s.groupId === groupId);
    // Take top N
    for (let i = 0; i < qualifyPerGroup && i < groupStandings.length; i++) {
      qualifiers.push(groupStandings[i].teamId);
      
      // Mark as qualified in DB
      await prisma.tournamentStanding.update({
        where: { id: groupStandings[i].id },
        data: { qualified: true },
      });
    }
  }

  if (qualifiers.length === 0) return;

  // Seed them into a bracket (cross-seeding logic could be complex, simple sequential for now)
  const knockoutSlots = generateKnockoutBracket(qualifiers);

  // Determine starting match number (after all group matches)
  const lastGroupMatch = await prisma.tournamentMatch.findFirst({
    where: { tournamentId },
    orderBy: { matchNumber: 'desc' },
  });
  
  let startNumber = (lastGroupMatch?.matchNumber ?? 0) + 1;

  // Insert knockout matches
  for (const slot of knockoutSlots) {
    await prisma.tournamentMatch.create({
      data: {
        tournamentId,
        stage: slot.stage as any,
        matchNumber: startNumber++,
        teamAId: slot.teamAId || 'TBD', // We use 'TBD' string if null since DB requires string
        teamBId: slot.teamBId || 'TBD',
        status: 'SCHEDULED',
      },
    });
  }
}
