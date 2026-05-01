/**
 * Tournament Engine — Billing Logic
 * Deducts ৳40 from organizer wallet when a tournament match goes LIVE.
 * Platform tournaments are never charged.
 */
import prisma from '@/lib/prisma';

const MATCH_CHARGE_TAKA = 40;

export type BillingResult =
  | { ok: true; newBalance: number }
  | { ok: false; reason: 'insufficient_funds' | 'wallet_not_found' | 'platform_tournament' };

/**
 * Attempt to charge ৳40 from the organizer's wallet for a tournament match going LIVE.
 * Creates a transaction record and updates the wallet atomically.
 */
export async function chargeMatchFee(
  tournamentId: string,
  matchId: string
): Promise<BillingResult> {
  // Fetch the tournament operator type
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { operatorType: true, operatorId: true },
  });

  if (!tournament) throw new Error(`Tournament ${tournamentId} not found`);

  // Platform tournaments are never charged
  if (tournament.operatorType === 'PLATFORM') {
    return { ok: true, newBalance: 0 };
  }

  // Find the organizer's wallet
  const wallet = await prisma.organizerWallet.findUnique({
    where: { organizerId: tournament.operatorId },
  });

  if (!wallet) return { ok: false, reason: 'wallet_not_found' };

  if (wallet.balance < MATCH_CHARGE_TAKA) {
    return { ok: false, reason: 'insufficient_funds' };
  }

  // Atomic deduction + transaction record
  const [updatedWallet] = await prisma.$transaction([
    prisma.organizerWallet.update({
      where: { organizerId: tournament.operatorId },
      data: {
        balance: { decrement: MATCH_CHARGE_TAKA },
        totalSpent: { increment: MATCH_CHARGE_TAKA },
      },
    }),
    prisma.organizerWalletTransaction.create({
      data: {
        organizerId: tournament.operatorId,
        type: 'MATCH_CHARGE',
        amount: MATCH_CHARGE_TAKA,
        matchId,
        description: `Match charge for tournament match ${matchId}`,
      },
    }),
  ]);

  return { ok: true, newBalance: updatedWallet.balance };
}

/**
 * Refund ৳40 to the organizer wallet when a match is cancelled.
 */
export async function refundMatchFee(
  tournamentId: string,
  matchId: string
): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { operatorType: true, operatorId: true },
  });

  if (!tournament || tournament.operatorType === 'PLATFORM') return;

  await prisma.$transaction([
    prisma.organizerWallet.update({
      where: { organizerId: tournament.operatorId },
      data: {
        balance: { increment: MATCH_CHARGE_TAKA },
        totalSpent: { decrement: MATCH_CHARGE_TAKA },
      },
    }),
    prisma.organizerWalletTransaction.create({
      data: {
        organizerId: tournament.operatorId,
        type: 'REFUND',
        amount: MATCH_CHARGE_TAKA,
        matchId,
        description: `Refund for cancelled match ${matchId}`,
      },
    }),
  ]);
}

/**
 * Refund all unplayed match fees when a tournament is cancelled mid-way.
 */
export async function refundUnplayedMatches(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { operatorType: true, operatorId: true },
  });

  if (!tournament || tournament.operatorType === 'PLATFORM') return;

  // Count matches that went LIVE (were charged) but are now CANCELLED/POSTPONED
  const liveMatches = await prisma.tournamentMatch.count({
    where: { tournamentId, status: { in: ['LIVE', 'SCHEDULED', 'SCORER_ASSIGNED'] } },
  });

  if (liveMatches === 0) return;

  const refundTotal = liveMatches * MATCH_CHARGE_TAKA;

  await prisma.$transaction([
    prisma.organizerWallet.update({
      where: { organizerId: tournament.operatorId },
      data: {
        balance: { increment: refundTotal },
        totalSpent: { decrement: refundTotal },
      },
    }),
    prisma.organizerWalletTransaction.create({
      data: {
        organizerId: tournament.operatorId,
        type: 'REFUND',
        amount: refundTotal,
        description: `Tournament ${tournamentId} cancelled — refund for ${liveMatches} unplayed matches`,
      },
    }),
  ]);
}
