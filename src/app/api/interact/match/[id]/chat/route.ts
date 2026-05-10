import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all chat messages for a match
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const messages = await prisma.matchChatMessage.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      include: { player: { select: { id: true, fullName: true, avatarUrl: true } } }
    });
    return NextResponse.json({ messages });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Send a chat message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

    // Verify player is OMC in this match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
      }
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const isTeamA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isTeamB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);

    if (!isTeamA && !isTeamB) return NextResponse.json({ error: 'Not in this match' }, { status: 403 });

    const myTeam = isTeamA ? match.teamA : match.teamB;
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');

    if (!['owner', 'manager', 'captain'].includes(myRole)) {
      return NextResponse.json({ error: 'Only OMC can chat' }, { status: 403 });
    }

    const teamId = isTeamA ? match.teamA_Id : match.teamB_Id;

    const msg = await prisma.matchChatMessage.create({
      data: { matchId, playerId, teamId, message: message.trim() },
      include: { player: { select: { id: true, fullName: true, avatarUrl: true } } }
    });

    // Broadcast via Supabase Realtime so opponent sees instantly
    try {
      const { getSupabaseClient } = await import('@/lib/supabaseRealtime');
      const sb = getSupabaseClient();
      const ch = sb.channel(`interact:${matchId}`);
      ch.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await ch.send({ type: 'broadcast', event: 'chat_message', payload: { message: msg } });
          setTimeout(() => sb.removeChannel(ch), 200);
        }
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, message: msg });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
