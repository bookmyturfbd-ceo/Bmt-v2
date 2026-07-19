import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetSubcategories = [
    'Argentina Polo',
    'Portugal Polo',
    'Brazil Polo',
    'Germany Polo',
    'France Polo',
    'Spain Polo',
    'Bangladesh Polo',
  ];

  console.log('--- Step 1: Ensure Parent "FIFA 2026" Category is ACTIVE ---');
  await prisma.shopCategory.updateMany({
    where: { name: { equals: 'FIFA 2026', mode: 'insensitive' } },
    data: { active: true },
  });

  console.log('--- Step 2: Set ONLY the 7 Subcategories in screenshot to active = false ---');
  const subCats = await prisma.shopCategory.findMany({
    where: {
      OR: targetSubcategories.map(name => ({ name: { equals: name, mode: 'insensitive' } }))
    }
  });

  const subCatIds = subCats.map(c => c.id);
  console.log('Target Subcategories:', subCats.map(c => ({ id: c.id, name: c.name })));

  if (subCatIds.length > 0) {
    const updatedSubCats = await prisma.shopCategory.updateMany({
      where: { id: { in: subCatIds } },
      data: { active: false }
    });
    console.log(`Updated ${updatedSubCats.count} subcategories to active = false`);

    console.log('--- Step 3: Set Products linked to these 7 subcategories to status = hidden ---');
    const updatedProds = await prisma.shopProduct.updateMany({
      where: { categoryId: { in: subCatIds } },
      data: { status: 'hidden' }
    });
    console.log(`Updated ${updatedProds.count} products to status = hidden`);
  }

  // Restore parent FIFA 2026 products if any exist directly under parent
  const parentCat = await prisma.shopCategory.findFirst({
    where: { name: { equals: 'FIFA 2026', mode: 'insensitive' } }
  });

  if (parentCat) {
    console.log(`Parent FIFA 2026 status set to ACTIVE (id: ${parentCat.id})`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
