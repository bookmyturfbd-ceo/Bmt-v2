import crypto from 'crypto';

const SECRET = process.env.BMT_SECRET || 'casual_match_scorer_secret_key';

export function createCasualScorerToken(matchId: string): string {
  const hash = crypto.createHmac('sha256', SECRET).update(matchId).digest('hex');
  return `${matchId}.${hash}`;
}

export function validateCasualScorerToken(token: string): string | null {
  try {
    const [matchId, hash] = token.split('.');
    if (!matchId || !hash) return null;
    const expectedHash = crypto.createHmac('sha256', SECRET).update(matchId).digest('hex');
    if (hash !== expectedHash) return null;
    return matchId;
  } catch {
    return null;
  }
}
