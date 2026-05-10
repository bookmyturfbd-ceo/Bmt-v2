import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const memberInclude = {
  player: { select: { id: true, fullName: true, avatarUrl: true } },
};

async function fetchGroup(id: string) {
  return prisma.playGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          ...memberInclude,
          splitRequests: { where: { status: 'PENDING' }, take: 1, orderBy: { createdAt: 'desc' } },
        } as any,
      },
    },
  });
}

// GET /api/play/groups/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const group = await fetchGroup(id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  return NextResponse.json({ group });
}

// PATCH /api/play/groups/[id]
// Actions: add_member | remove_member | set_split | rename | disband
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const group = await fetchGroup(id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  // Only owner can mutate
  if (group.ownerId !== playerId) {
    return NextResponse.json({ error: 'Forbidden — owner only' }, { status: 403 });
  }

  if (action === 'add_member') {
    const { playerId: targetId } = body;
    const already = group.members.some((m) => m.playerId === targetId);
    if (!already) {
      await prisma.playGroupMember.create({ data: { groupId: id, playerId: targetId } });
    }
    return NextResponse.json({ group: await fetchGroup(id) });
  }

  if (action === 'remove_member') {
    const { memberId } = body; // PlayGroupMember.id
    await prisma.playGroupMember.delete({ where: { id: memberId } });
    return NextResponse.json({ group: await fetchGroup(id) });
  }

  if (action === 'set_split') {
    const { memberId, amount } = body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Find the membership record
    const member = group.members.find(m => m.id === memberId);
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // If owner is setting their own split → apply immediately, no request needed
    if (member.playerId === playerId) {
      await prisma.playGroupMember.update({ where: { id: memberId }, data: { splitAmount: parsedAmount } });
      return NextResponse.json({ group: await fetchGroup(id), immediate: true });
    }

    // For other members → cancel any existing PENDING split request, create a new one
    await prisma.playSplitRequest.updateMany({
      where: { memberId, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    await prisma.playSplitRequest.create({ data: { groupId: id, memberId, amount: parsedAmount } });
    return NextResponse.json({ group: await fetchGroup(id), immediate: false });
  }

  if (action === 'rename') {
    const { name } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    await prisma.playGroup.update({ where: { id }, data: { name: name.trim() } });
    return NextResponse.json({ group: await fetchGroup(id) });
  }

  if (action === 'disband') {
    await prisma.playGroup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
