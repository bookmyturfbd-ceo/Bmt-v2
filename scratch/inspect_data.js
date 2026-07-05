const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  try {
    const iconTurfId = 'cmqj9es2b000004jl32igmnys';
    const iconOwnerId = 'cmqj8jjpj000004jpcq7g0thz';

    // Bookings
    const bookings = await prisma.booking.findMany();
    console.log('--- BOOKINGS ---');
    console.log(`Total bookings: ${bookings.length}`);
    for (const b of bookings) {
      console.log(`Booking ID: ${b.id}, TurfId: ${b.turfId}, SlotId: ${b.slotId}`);
    }

    // Teams
    console.log('\n--- TEAMS ---');
    const teams = await prisma.team.findMany({
      include: {
        homeTurfs: true
      }
    });
    for (const t of teams) {
      console.log(`Team ID: ${t.id}, Name: ${t.name}, HomeTurfs: ${t.homeTurfs?.map(ht => ht.name).join(', ')}`);
    }

    // Monthly fees
    console.log('\n--- MONTHLY FEES ---');
    const fees = await prisma.monthlyFee.findMany();
    console.log(`Total monthly fees: ${fees.length}`);
    for (const f of fees) {
      console.log(`Fee ID: ${f.id}, TurfId: ${f.turfId}, TurfName: ${f.turfName}`);
    }

    // Divisions
    console.log('\n--- DIVISIONS ---');
    const divisions = await prisma.division.findMany({
      include: {
        cities: true
      }
    });
    for (const d of divisions) {
      console.log(`Division ID: ${d.id}, Name: ${d.name}, Cities: ${d.cities.map(c => c.name).join(', ')}`);
    }

    // WbtTurfs
    console.log('\n--- WBT TURFS ---');
    const wbts = await prisma.wbtTurf.findMany();
    for (const w of wbts) {
      console.log(`WBT Turf ID: ${w.id}, Name: ${w.name}, DivisionId: ${w.divisionId}, CityId: ${w.cityId}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
