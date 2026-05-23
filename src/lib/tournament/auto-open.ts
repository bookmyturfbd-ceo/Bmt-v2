import prisma from '@/lib/prisma';

/**
 * Checks if a single tournament has an elapsed countdown and transitions it to REGISTRATION_OPEN.
 * Returns the updated tournament object.
 */
export async function checkAndAutoOpen(tournament: any): Promise<any> {
  if (!tournament) return tournament;
  
  const now = new Date();
  if (
    tournament.status === 'DRAFT' &&
    tournament.registrationOpenAt &&
    new Date(tournament.registrationOpenAt) <= now
  ) {
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        status: 'REGISTRATION_OPEN',
        isRegistrationOpen: true,
      },
    });

    // Merge changes back into original tournament object to preserve preloaded relations
    return {
      ...tournament,
      status: 'REGISTRATION_OPEN',
      isRegistrationOpen: true,
    };
  }

  return tournament;
}

/**
 * Checks an array of tournaments for elapsed countdowns, updates them in bulk, and returns the modified list.
 */
export async function checkAndAutoOpenList(tournaments: any[]): Promise<any[]> {
  if (!tournaments || tournaments.length === 0) return tournaments || [];

  const now = new Date();
  const toUpdate = tournaments.filter(
    (t) =>
      t.status === 'DRAFT' &&
      t.registrationOpenAt &&
      new Date(t.registrationOpenAt) <= now
  );

  if (toUpdate.length === 0) return tournaments;

  const ids = toUpdate.map((t) => t.id);
  await prisma.tournament.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'REGISTRATION_OPEN',
      isRegistrationOpen: true,
    },
  });

  return tournaments.map((t) => {
    if (ids.includes(t.id)) {
      return {
        ...t,
        status: 'REGISTRATION_OPEN',
        isRegistrationOpen: true,
      };
    }
    return t;
  });
}
