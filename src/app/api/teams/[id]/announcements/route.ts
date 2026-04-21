import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const announcements = await prisma.teamAnnouncement.findMany({
      where: { teamId: id },
      include: { author: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(announcements);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const auth = cookieStore.get('bmt_auth')?.value;
  const myPlayerId = cookieStore.get('bmt_player_id')?.value;
  if (!auth || !myPlayerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, content } = await req.json();

    const announcement = await prisma.teamAnnouncement.create({
      data: {
        teamId: id,
        authorId: myPlayerId,
        title,
        content
      },
      include: { author: { select: { fullName: true } } }
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const auth = cookieStore.get('bmt_auth')?.value;
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const annId = searchParams.get('annId');
    if (!annId) return NextResponse.json({ error: 'No announcement id provided' }, { status: 400 });

    await prisma.teamAnnouncement.delete({
      where: { id: annId }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const auth = cookieStore.get('bmt_auth')?.value;
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const annId = searchParams.get('annId');
    if (!annId) return NextResponse.json({ error: 'No announcement id provided' }, { status: 400 });

    const { title, content } = await req.json();

    const updated = await prisma.teamAnnouncement.update({
      where: { id: annId },
      data: { title, content },
      include: { author: { select: { fullName: true } } }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}
