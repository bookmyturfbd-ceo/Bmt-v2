import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/play/requests/[id]/chat
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const request = await prisma.playJoinRequest.findUnique({
    where: { id: requestId },
    include: { listing: { include: { group: true } } },
  });
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwner = request.listing.group.ownerId === playerId;
  const isRequester = request.playerId === playerId;
  if (!isOwner && !isRequester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const msgs = await prisma.playRequestChat.findMany({
    where: { requestId },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { player: { select: { id: true, fullName: true, avatarUrl: true } } },
  });

  return NextResponse.json({ messages: msgs });
}

// POST /api/play/requests/[id]/chat
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const request = await prisma.playJoinRequest.findUnique({
    where: { id: requestId },
    include: { listing: { include: { group: true } } },
  });
  if (!request || request.status !== 'ACCEPTED') {
    return NextResponse.json({ error: 'Request not accepted' }, { status: 403 });
  }

  const isOwner = request.listing.group.ownerId === playerId;
  const isRequester = request.playerId === playerId;
  if (!isOwner && !isRequester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Empty' }, { status: 400 });

  const msg = await prisma.playRequestChat.create({
    data: { requestId, playerId, message: message.trim() },
    include: { player: { select: { id: true, fullName: true, avatarUrl: true } } },
  });

  return NextResponse.json({ message: msg });
}
