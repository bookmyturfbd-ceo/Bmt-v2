import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton for realtime subscriptions (client-side only)
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return _client;
}

const activeChannels: Record<string, ReturnType<typeof createClient>['channel']> = {};

/** Subscribe to a match scoring channel and handle incoming events */
export function subscribeToMatchChannel(
  matchId: string,
  onEvent: (payload: { event: string; data: any }) => void
) {
  const client = getSupabaseClient();
  const channelName = `match:${matchId}:scoring`;

  let channel = activeChannels[channelName];
  if (!channel) {
    channel = client.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    activeChannels[channelName] = channel;
  }

  // Set up the listener
  const subscription = channel.on('broadcast', { event: '*' }, (msg: any) => {
    onEvent({ event: msg.event, data: msg.payload });
  });

  return {
    unsubscribe: () => {
      // Clean up the specific listener instead of the whole channel if needed,
      // but for React unmount semantics, we can remove the channel completely
      client.removeChannel(channel);
      delete activeChannels[channelName];
    }
  };
}

/** Broadcast an event to a match channel (works securely from server/API) */
export function broadcastMatchEvent(
  matchId: string,
  event: string,
  data: Record<string, any>
): Promise<boolean> {
  return new Promise((resolve) => {
    const client = getSupabaseClient();
    const channelName = `match:${matchId}:scoring`;
    
    // Create a temporary channel for this broadcast
    const channel = client.channel(channelName);
    
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.send({
            type: 'broadcast',
            event: event,
            payload: data,
          });
        } catch (error) {
          console.error(`Failed to broadcast ${event}:`, error);
        } finally {
          setTimeout(() => client.removeChannel(channel), 100);
          resolve(true); // Always resolve once subscribed and attempted
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        resolve(false);
      }
    });

    // Timeout fallback just in case WebSocket hangs
    setTimeout(() => {
      resolve(false);
    }, 2000);
  });
}
