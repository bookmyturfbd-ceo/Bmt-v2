import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getPlayerId(req: NextRequest): string | null {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const playerId = getPlayerId(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { id: teamId } = await params;

  // Check if team member
  const member = await prisma.teamMember.findFirst({
    where: { teamId, playerId }
  });
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  const isOwner = team?.ownerId === playerId;

  if (!member && !isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const templates = await prisma.teamLineupTemplate.findMany({
    where: { teamId }
  });

  return NextResponse.json({ success: true, templates });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const playerId = getPlayerId(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { id: teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: { select: { playerId: true, role: true } } }
  });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const myMember = team.members.find(m => m.playerId === playerId);
  const myRole = team.ownerId === playerId ? 'owner' : (myMember?.role || 'none');

  const allowedRoles = ['owner', 'manager', 'captain', 'vice_captain'];
  if (!allowedRoles.includes(myRole)) {
    return NextResponse.json({ error: 'Unauthorized: Only Owner, Manager, Captain, or Vice-Captain can write templates' }, { status: 403 });
  }

  const { format, formation, positions } = await req.json();
  if (!format || !formation || !positions) {
    return NextResponse.json({ error: 'Missing format, formation, or positions' }, { status: 400 });
  }

  const formatMap: Record<string, any> = {
    '5v5': 'F_5v5',
    '6v6': 'F_6v6',
    '7v7': 'F_7v7',
    '11v11': 'F_11v11',
  };

  const dbFormat = formatMap[format] || format;
  if (!['F_5v5', 'F_6v6', 'F_7v7', 'F_11v11'].includes(dbFormat)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }

  const template = await prisma.teamLineupTemplate.upsert({
    where: {
      teamId_format: { teamId, format: dbFormat }
    },
    update: {
      formation,
      positions
    },
    create: {
      teamId,
      format: dbFormat,
      formation,
      positions
    }
  });

  return NextResponse.json({ success: true, template });
}
