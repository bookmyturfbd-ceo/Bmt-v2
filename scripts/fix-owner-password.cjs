const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'v1@bmt.com';
  const owner = await prisma.owner.findUnique({ where: { email } });
  if (!owner) { console.log('Owner not found'); return; }

  const hash = owner.password;

  // Check if it looks like a bcrypt hash
  const isBcrypt = hash.startsWith('$2b$') || hash.startsWith('$2a$');
  console.log('Password hash:', hash);
  console.log('Is bcrypt hashed:', isBcrypt);

  if (!isBcrypt) {
    console.log('\n⚠️  Password is stored as PLAIN TEXT. Hashing it now...');
    const newHash = await bcrypt.hash(hash, 10);
    await prisma.owner.update({ where: { email }, data: { password: newHash } });
    console.log('✅ Password re-hashed. You can now log in with your original password.');
  } else {
    console.log('\n✅ Password is correctly hashed. Login should work.');
    console.log('If login still fails, the password entered doesnt match the hash stored.');
    console.log('Run the reset script or use Super Admin -> Reset Passwords to set a new one.');
  }
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
