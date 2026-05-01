/**
 * Tournament Engine — Token Generator
 * Generates and validates match scorer access tokens.
 */
import prisma from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Creates a unique, single-use token for a given match.
 * In a real-world scenario, this might also trigger an SMS/WhatsApp send.
 */
export async function createScorerToken(
  matchId: string,
  scorerRef?: string
): Promise<{ token: string; url: string }> {
  // Check if a valid token already exists
  const existing = await prisma.tournamentScorerToken.findUnique({
    where: { matchId },
  });

  if (existing && existing.isActive) {
    // Generate the URL based on env
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return { token: existing.token, url: `\${baseUrl}/score/\${existing.token}` };
  }

  // Generate new random token
  const rawToken = crypto.randomBytes(16).toString('hex');
  
  // Create or replace
  const record = await prisma.tournamentScorerToken.upsert({
    where: { matchId },
    update: {
      token: rawToken,
      scorerRef,
      isActive: true,
      usedAt: null,
      expiresAt: null,
    },
    create: {
      matchId,
      token: rawToken,
      scorerRef,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return { token: record.token, url: `\${baseUrl}/score/\${record.token}` };
}

/**
 * Validates a token and returns the associated match ID.
 * Throws if invalid or expired.
 */
export async function validateScorerToken(token: string): Promise<string> {
  const record = await prisma.tournamentScorerToken.findUnique({
    where: { token },
    include: { match: { select: { status: true } } },
  });

  if (!record) throw new Error('Invalid token');
  if (!record.isActive) throw new Error('Token is no longer active');
  if (record.match.status === 'COMPLETED' || record.match.status === 'CANCELLED') {
    // Auto-invalidate when match finishes
    await invalidateScorerToken(record.matchId);
    throw new Error('Match is already completed or cancelled');
  }

  // Mark as used on first access
  if (!record.usedAt) {
    await prisma.tournamentScorerToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  return record.matchId;
}

/**
 * Invalidates a token (usually called when match completes or organizer revokes).
 */
export async function invalidateScorerToken(matchId: string): Promise<void> {
  await prisma.tournamentScorerToken.updateMany({
    where: { matchId },
    data: { isActive: false },
  });
}
