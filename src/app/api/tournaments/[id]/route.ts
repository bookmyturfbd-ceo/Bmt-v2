import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';

function verifyToken(token: string): any | null {
  try {
    const [data, sig] = token.split('.');
    const secret = process.env.BMT_SECRET || 'bmt_secret_key';
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

async function getOrganizerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('org_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.type === 'ORGANIZER' ? decoded.id : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: true,
        registrations: {
          select: {
            id: true, entityId: true, entityType: true,
            registeredAt: true, status: true, entryFeePaid: true,
          },
          orderBy: { registeredAt: 'asc' },
        },
        _count: { select: { registrations: true, matches: true } },
      },
    });
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    // Enrich registrations with actual team/player data
    const teamIds = tournament.registrations.filter(r => r.entityType === 'TEAM').map(r => r.entityId);
    const playerIds = tournament.registrations.filter(r => r.entityType === 'PLAYER').map(r => r.entityId);

    const [teams, players] = await Promise.all([
      teamIds.length > 0 ? prisma.team.findMany({
        where: { id: { in: teamIds } },
        include: {
          members: {
            include: {
              player: { select: { id: true, fullName: true, avatarUrl: true, footballMmr: true, cricketMmr: true, level: true } }
            }
          }
        }
      }) : Promise.resolve([]),
      playerIds.length > 0 ? prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, fullName: true, avatarUrl: true, footballMmr: true, cricketMmr: true, level: true }
      }) : Promise.resolve([])
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));
    const playerMap = new Map(players.map(p => [p.id, p]));

    const enrichedRegistrations = tournament.registrations.map(r => ({
      ...r,
      team: r.entityType === 'TEAM' ? teamMap.get(r.entityId) : null,
      player: r.entityType === 'PLAYER' ? playerMap.get(r.entityId) : null,
    }));

    const data = { ...tournament, registrations: enrichedRegistrations };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }
    const updated = await prisma.tournament.update({ where: { id }, data: body });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organizerId = await getOrganizerId();
    if (!organizerId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        operatorId: true,
        registrations: { select: { entryFeePaid: true } },
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (tournament.operatorId !== organizerId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const hasPaid = tournament.registrations.some(r => r.entryFeePaid);
    if (hasPaid) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete — teams have already paid entry fees.' },
        { status: 400 }
      );
    }

    await prisma.tournament.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
