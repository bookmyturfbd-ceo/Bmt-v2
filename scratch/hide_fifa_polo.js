const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const poloNames = [
    'FIFA 2026',
    'Argentina Polo',
    'Portugal Polo',
    'Brazil Polo',
    'Germany Polo',
    'France Polo',
    'Spain Polo',
    'Bangladesh Polo',
  ];

  console.log('--- Searching for Categories matching names ---');
  const categories = await prisma.shopCategory.findMany({
    where: {
      OR: poloNames.map(name => ({ name: { contains: name, mode: 'insensitive' } }))
    }
  });

  console.log('Found Categories:', categories.map(c => ({ id: c.id, name: c.name, active: c.active })));

  const categoryIds = categories.map(c => c.id);

  console.log('--- Updating Categories to active = false ---');
  const updatedCats = await prisma.shopCategory.updateMany({
    where: {
      id: { in: categoryIds }
    },
    data: {
      active: false
    }
  });
  console.log(`Updated ${updatedCats.count} categories to active = false`);

  console.log('--- Updating Products linked to these categories or matching names ---');
  const updatedProds = await prisma.shopProduct.updateMany({
    where: {
      OR: [
        { categoryId: { in: categoryIds } },
        ...poloNames.map(name => ({ name: { contains: name, mode: 'insensitive' } }))
      ]
    },
    data: {
      status: 'hidden'
    }
  });
  console.log(`Updated ${updatedProds.count} products to status = hidden`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
