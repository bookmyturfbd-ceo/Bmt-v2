import { cookies } from 'next/headers';

/**
 * Retrieves the currently logged-in user ID server-side across all roles.
 */
export async function getUserIdFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  
  const playerId = cookieStore.get('bmt_player_id')?.value;
  if (playerId) return playerId;

  const ownerId = cookieStore.get('bmt_owner_id')?.value;
  if (ownerId) return ownerId;

  const orgToken = cookieStore.get('org_token')?.value;
  if (orgToken) {
    try {
      const parts = orgToken.split('.');
      if (parts[0]) {
        const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        return payload.id || null;
      }
    } catch (e) {
      console.error('Server: Failed to parse organizer token cookie:', e);
    }
  }

  return null;
}
