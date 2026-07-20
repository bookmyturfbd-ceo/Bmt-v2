import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const deletedOwners = await prisma.owner.deleteMany({
      where: {
        OR: [
          { email: { contains: 'fc@bmt.com', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } },
          { name: { contains: 'test', mode: 'insensitive' } },
        ],
      },
    });

    const deletedTurfs = await prisma.turf.deleteMany({
      where: {
        OR: [
          { name: { contains: 'test', mode: 'insensitive' } },
        ],
      },
    });

    // Clean any ' Profile' suffix from coach names
    const profileTurfs = await prisma.turf.findMany({
      where: { isCoachProfile: true, name: { endsWith: ' Profile' } },
    });
    for (const t of profileTurfs) {
      const clean = t.name.replace(/\s+Profile$/i, '').trim();
      await prisma.turf.update({ where: { id: t.id }, data: { name: clean } });
      await prisma.owner.update({ where: { id: t.ownerId }, data: { name: clean } }).catch(() => {});
    }

    const remainingCoaches = await prisma.turf.findMany({
      where: { isCoachProfile: true },
      select: { id: true, name: true, status: true, ownerId: true, isVerified: true },
    });

    return NextResponse.json({
      success: true,
      deletedOwnersCount: deletedOwners.count,
      deletedTurfsCount: deletedTurfs.count,
      remainingCoaches,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
