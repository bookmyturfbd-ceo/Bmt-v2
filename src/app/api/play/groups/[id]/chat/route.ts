import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/play/groups/[id]/chat — load history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const msgs = await prisma.playGroupChat.findMany({
    where: { groupId },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { player: { select: { id: true, fullName: true, avatarUrl: true } } },
  });
  return NextResponse.json({ messages: msgs });
}

// POST /api/play/groups/[id]/chat — send message + persist
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Must be a member
  const membership = await prisma.playGroupMember.findFirst({ where: { groupId, playerId } });
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

  const msg = await prisma.playGroupChat.create({
    data: { groupId, playerId, message: message.trim() },
    include: { player: { select: { id: true, fullName: true, avatarUrl: true } } },
  });

  return NextResponse.json({ message: msg });
}
