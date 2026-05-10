import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// Server-Sent Events endpoint — pushes match state updates to the client in real-time.
// Strategy: poll the DB server-side every 2s; only emit when something changes.
// Much cheaper than WebSockets for this scale; instant relative to 30s client polling.
export async function GET(request: NextRequest) {
  const playerId = request.cookies.get('bmt_player_id')?.value;
  if (!playerId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      // Initial ping so the browser knows we're connected
      controller.enqueue(encoder.encode(': ping\n\n'));

      let lastSnapshot = '';

      const poll = async () => {
        try {
          // Fetch active matches where this player participates (via team membership)
          const matches = await prisma.match.findMany({
            where: {
              status: { in: ['PENDING', 'INTERACTION', 'SCHEDULED', 'LIVE', 'SCORE_ENTRY', 'COMPLETED', 'DISPUTED'] },
              OR: [
                { teamA: { members: { some: { playerId } } } },
                { teamB: { members: { some: { playerId } } } },
                { teamA: { ownerId: playerId } },
                { teamB: { ownerId: playerId } },
              ],
            },
            select: {
              id: true,
              status: true,
              matchStartedByA: true,
              matchStartedByB: true,
              matchEndedByA: true,
              matchEndedByB: true,
              scoreSubmittedByA: true,
              scoreSubmittedByB: true,
              agreedByA: true,
              agreedByB: true,
              scoreA: true,
              scoreB: true,
              winnerId: true,
              mmrChangeA: true,
              mmrChangeB: true,
            },
          });

          const snapshot = JSON.stringify(
            matches.map(m => ({
              id: m.id,
              st: m.status,
              sa: m.matchStartedByA,
              sb: m.matchStartedByB,
              ea: m.matchEndedByA,
              eb: m.matchEndedByB,
              sca: m.scoreSubmittedByA,
              scb: m.scoreSubmittedByB,
              aga: m.agreedByA,
              agb: m.agreedByB,
            }))
          );

          if (snapshot !== lastSnapshot) {
            lastSnapshot = snapshot;
            send({ type: 'refresh', matches: matches.map(m => m.id) });
          }
        } catch {
          // DB error — silent, client keeps connection
        }
      };

      await poll(); // immediate first check
      const iv = setInterval(poll, 2000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(iv);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',     // disables Nginx buffering in prod
    },
  });
}
