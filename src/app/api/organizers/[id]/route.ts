import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { chargePerTournament, banStatus } = body;

    const dataToUpdate: any = {};
    if (typeof chargePerTournament === 'number') {
      dataToUpdate.chargePerTournament = chargePerTournament;
    }
    if (banStatus === 'none' || banStatus === 'perma') {
      dataToUpdate.banStatus = banStatus;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    const updatedOrganizer = await prisma.organizer.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, data: updatedOrganizer });
  } catch (error: any) {
    console.error('Error updating organizer:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      // Tournament has onDelete: Restrict — delete their tournaments first.
      // All children (registrations, groups, matches, standings, auction rooms)
      // cascade automatically per the schema.
      await tx.tournament.deleteMany({ where: { operatorId: id } });

      // Now safe to delete the organizer — wallet + invite cascade automatically.
      await tx.organizer.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting organizer:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
