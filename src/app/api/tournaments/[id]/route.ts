import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: true,
        _count: {
          select: { registrations: true, matches: true }
        }
      }
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tournament });
  } catch (error: any) {
    console.error('Error fetching tournament:', error);
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
    
    // Check if exists
    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    // Update
    const updated = await prisma.tournament.update({
      where: { id },
      data: body
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating tournament:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Usually we cancel instead of delete to keep history, but allowing delete for drafts
    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Can only delete tournaments in DRAFT status. Use /cancel for active ones.' }, { status: 400 });
    }

    await prisma.tournament.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Tournament deleted' });
  } catch (error: any) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
