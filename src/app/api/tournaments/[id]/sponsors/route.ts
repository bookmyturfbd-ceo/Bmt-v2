import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/tournaments/[id]/sponsors — public
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sponsors = await prisma.tournamentSponsor.findMany({
    where: { tournamentId: id },
    orderBy: [{ type: 'asc' }, { order: 'asc' }],
  });
  return NextResponse.json({ success: true, data: sponsors });
}

// POST /api/tournaments/[id]/sponsors — organizer creates a sponsor
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, logoUrl, type, ctaUrl, order } = body;

    if (!name || !logoUrl) {
      return NextResponse.json({ success: false, error: 'name and logoUrl are required' }, { status: 400 });
    }

    const sponsor = await prisma.tournamentSponsor.create({
      data: { tournamentId: id, name, logoUrl, type: type || 'CO_SPONSOR', ctaUrl: ctaUrl || null, order: order ?? 0 },
    });

    return NextResponse.json({ success: true, data: sponsor });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/tournaments/[id]/sponsors?sponsorId=xxx
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sponsorId = new URL(req.url).searchParams.get('sponsorId');
    if (!sponsorId) return NextResponse.json({ success: false, error: 'sponsorId required' }, { status: 400 });

    await prisma.tournamentSponsor.deleteMany({ where: { id: sponsorId, tournamentId: id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
