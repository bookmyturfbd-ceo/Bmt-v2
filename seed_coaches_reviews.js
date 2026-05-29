const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env', 'utf-8');
let databaseUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.split('DATABASE_URL=')[1].trim().replace(/"/g, '').replace(/'/g, '');
    break;
  }
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  try {
    const ownerId = 'cmnwn7l3t000110hw3yg7eh1z';
    const divisionId = 'cmnvygv5n0001ichwldhw49hj';
    const cityId = 'cmnvygy780002ichwsew6mlyv';
    const playerId = 'cmnycrhlh0003vwhwebuovkdo';

    console.log('Seeding professionals (specialized turfs)...');

    // 1. Seed Professionals
    const coach = await prisma.turf.create({
      data: {
        name: 'Coach S. Rahman',
        ownerId,
        divisionId,
        cityId,
        area: 'Uttara Sector 4',
        isCoachProfile: true,
        coachType: 'COACH',
        status: 'published',
      }
    });
    console.log('Created Coach:', coach.name, coach.id);

    const referee = await prisma.turf.create({
      data: {
        name: 'Ref H. Kabir',
        ownerId,
        divisionId,
        cityId,
        area: 'Banani',
        isCoachProfile: true,
        coachType: 'REF',
        status: 'published',
      }
    });
    console.log('Created Referee:', referee.name, referee.id);

    const trainer = await prisma.turf.create({
      data: {
        name: 'Trainer M. Islam',
        ownerId,
        divisionId,
        cityId,
        area: 'Dhanmondi',
        isCoachProfile: true,
        coachType: 'TRAINER',
        status: 'published',
      }
    });
    console.log('Created Trainer:', trainer.name, trainer.id);

    // 2. Seed Reviews for professionals in database
    console.log('Seeding reviews for professionals...');
    await prisma.review.create({
      data: {
        turfId: coach.id,
        playerId,
        playerName: 'Test Play 6',
        rating: 5,
        comment: 'Outstanding coaching! Highly technical and focused on youth growth.'
      }
    });
    await prisma.review.create({
      data: {
        turfId: referee.id,
        playerId,
        playerName: 'Test Play 6',
        rating: 4,
        comment: 'Very professional, kept the match under complete control. Great decision-making.'
      }
    });
    await prisma.review.create({
      data: {
        turfId: trainer.id,
        playerId,
        playerName: 'Test Play 6',
        rating: 5,
        comment: 'Excellent strength and conditioning coach. Tailored routines!'
      }
    });
    console.log('Professionals and reviews seeded successfully!');

    // 3. Register Player to Organizer\'s Tournament to allow review
    console.log('Registering player to tournament...');
    const tournamentId = 'cmphgpzob001nogn7xo56o2zy'; // Test Cup 3 by Test Organizer 2 (cmoqdbyyc000340hwkv9pt84u)
    
    // Check if registration already exists
    const existingReg = await prisma.tournamentRegistration.findFirst({
      where: {
        tournamentId,
        entityId: playerId
      }
    });

    if (!existingReg) {
      const reg = await prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          entityType: 'PLAYER',
          entityId: playerId,
          status: 'APPROVED',
          entryFeePaid: true
        }
      });
      console.log('Registered player to tournament:', reg.id);
    } else {
      console.log('Player already registered to tournament.');
    }

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
