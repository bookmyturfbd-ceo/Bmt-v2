import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  try {
    const { id, registrationId } = await params;

    const registration = await prisma.tournamentRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration || registration.tournamentId !== id) {
      return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Clean up any payout holding record if created
      await tx.tournamentPayout.deleteMany({
        where: {
          tournamentId: id,
          entityId: registration.entityId,
          entityType: registration.entityType,
        },
      });

      // Delete the registration
      await tx.tournamentRegistration.delete({
        where: { id: registrationId },
      });
    });

    return NextResponse.json({ success: true, message: 'Team removed successfully' });
  } catch (error: any) {
    console.error('Error deleting registration:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to remove team' }, { status: 500 });
  }
}
