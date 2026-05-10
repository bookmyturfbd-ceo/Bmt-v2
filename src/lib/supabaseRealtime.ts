import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Client singleton (client-side only) ──────────────────────────────────────
let _client: ReturnType<typeof createClient> | null = null;
export function getSupabaseClient() {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return _client;
}

let _subCounter = 0;

/**
 * Subscribe to a match scoring channel.
 * Each subscriber gets its own channel instance (Supabase Realtime supports
 * multiple channels to the same topic). Cleaned up on unsubscribe.
 */
export function subscribeToMatchChannel(
  matchId: string,
  onEvent: (payload: { event: string; data: any }) => void
) {
  const client = getSupabaseClient();
  const channelName = `match:${matchId}:scoring`;

  const channel = client.channel(channelName, {
    config: { broadcast: { self: false } },
  });

  channel.on('broadcast', { event: '*' }, (msg: any) => {
    onEvent({ event: msg.event, data: msg.payload });
  });

  channel.subscribe();

  return {
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}


/**
 * Broadcast an event to a match channel.
 *
 * Uses the Supabase REST Broadcast API instead of a WebSocket connection.
 * This is critical for reliability on serverless (Vercel) — WebSocket handshakes
 * are too slow for short-lived lambda functions and the broadcast never fires.
 *
 * Requires: Realtime + Broadcast enabled in Supabase Dashboard.
 */
export async function broadcastMatchEvent(
  matchId: string,
  event: string,
  data: Record<string, any>
): Promise<boolean> {
  return await _broadcast(matchId, `match:${matchId}:scoring`, event, data);
}

export async function broadcastInteractEvent(
  matchId: string,
  event: string,
  data: Record<string, any>
): Promise<boolean> {
  return await _broadcast(matchId, `interact:${matchId}`, event, data);
}

async function _broadcast(
  matchId: string,
  topic: string,
  event: string,
  data: Record<string, any>
): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        messages: [{ topic, event, payload: data }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[broadcastEvent] ${event} -> HTTP ${res.status}`, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[broadcastEvent] ${event} network error:`, err);
    return false;
  }
}
