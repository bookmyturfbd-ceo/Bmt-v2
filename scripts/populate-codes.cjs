const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateCode(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let res = prefix;
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

async function main() {
  console.log('Fetching players with null playerCode...');
  const players = await prisma.player.findMany({
    where: { playerCode: null }
  });
  console.log(`Found ${players.length} players without codes.`);

  for (const player of players) {
    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
      attempts++;
      const code = generateCode('P-');
      try {
        await prisma.player.update({
          where: { id: player.id },
          data: { playerCode: code }
        });
        success = true;
        console.log(`Assigned code ${code} to player ${player.fullName}`);
      } catch (err) {
        console.log(`Attempt ${attempts} failed for player ${player.fullName}: ${err.message}`);
      }
    }
  }

  console.log('Fetching teams with null teamCode...');
  const teams = await prisma.team.findMany({
    where: { teamCode: null }
  });
  console.log(`Found ${teams.length} teams without codes.`);

  for (const team of teams) {
    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
      attempts++;
      const code = generateCode('T-');
      try {
        await prisma.team.update({
          where: { id: team.id },
          data: { teamCode: code }
        });
        success = true;
        console.log(`Assigned code ${code} to team ${team.name}`);
      } catch (err) {
        console.log(`Attempt ${attempts} failed for team ${team.name}: ${err.message}`);
      }
    }
  }

  console.log('Migration complete!');
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
