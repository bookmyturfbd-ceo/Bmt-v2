const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('Running homepage query block...');
    const [
      sports,
      turfs,
      bannerSlides,
      carouselSettings,
      sponsors,
      sponsorSettings,
      turfServiceSetting,
      tournaments,
      rawTopTeams,
      rawTopPlayers
    ] = await Promise.all([
      prisma.sport.findMany(),
      prisma.turf.findMany({
        where: { status: 'published' },
        include: {
          sports: { include: { sport: true } },
          grounds: { include: { slots: true } },
        },
      }),
      prisma.bannerSlide.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.carouselSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.sponsor.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.sponsorSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.turfServiceSetting.findUnique({ where: { id: 'singleton' } }),
      prisma.tournament.findMany({
        where: {
          OR: [
            { status: { not: 'DRAFT' } },
            { status: 'DRAFT', isRegistrationOpen: true },
            { status: 'DRAFT', registrationOpenAt: { not: null } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.team.findMany({
        where: { teamType: 'REGULAR', isDisbanded: false },
        orderBy: { footballMmr: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          logoUrl: true,
          sportType: true,
          footballMmr: true,
          cricketMmr: true,
          _count: { select: { members: true } }
        }
      }),
      prisma.player.findMany({
        orderBy: { footballMmr: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          footballMmr: true,
          cricketMmr: true,
          teamMemberships: {
            take: 1,
            select: {
              team: { select: { name: true } }
            }
          }
        }
      })
    ]);
    console.log('Success! Results count:');
    console.log('sports:', sports.length);
    console.log('turfs:', turfs.length);

    console.log('Executing mapping logic...');

    function getInitials(name) {
      if (!name) return '?';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }

    // Build sportIds for each turf
    const turfsWithSportIds = turfs.map((t) => {
      let sportIds = t.sports.map((ts) => ts.sportId);

      if (sportIds.length === 0) {
        const slotSportNames = new Set();
        t.grounds.forEach((g) =>
          g.slots.forEach((s) =>
            s.sports.forEach((n) => slotSportNames.add(n))
          )
        );

        sportIds = sports
          .filter((sp) =>
            [...slotSportNames].some((n) =>
              n.toLowerCase().includes(sp.name.toLowerCase()) ||
              sp.name.toLowerCase().includes(n.toLowerCase())
            )
          )
          .map((sp) => sp.id);
      }

      return { ...t, sportIds };
    });

    // Separate standard turfs and professional coach profiles
    const standardTurfs = turfsWithSportIds.filter((t) => !t.isCoachProfile);
    const professionals = turfsWithSportIds.filter((t) => t.isCoachProfile);

    // Map leaderboard models
    const topTeams = rawTopTeams.map(t => ({
      id: t.id,
      name: t.name,
      logoUrl: t.logoUrl,
      sportType: t.sportType,
      mmr: t.sportType?.includes('CRICKET') ? t.cricketMmr : t.footballMmr,
      members: t._count.members,
    })).sort((a, b) => b.mmr - a.mmr);

    const topPlayers = rawTopPlayers.map(p => ({
      id: p.id,
      fullName: p.fullName,
      avatarUrl: p.avatarUrl,
      mmr: Math.max(p.footballMmr, p.cricketMmr),
      teamName: p.teamMemberships[0]?.team?.name || null
    })).sort((a, b) => b.mmr - a.mmr);

    console.log('Mapping logic executed successfully!');
    console.log('standardTurfs count:', standardTurfs.length);
    console.log('professionals count:', professionals.length);
    console.log('topTeams count:', topTeams.length);
    console.log('topPlayers count:', topPlayers.length);
  } catch (err) {
    console.error('CRITICAL HOMEPAGE QUERY ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
