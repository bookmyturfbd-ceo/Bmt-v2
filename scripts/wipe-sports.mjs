// One-time wipe script for old sports with no category
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.sport.deleteMany({});
  console.log(`Deleted ${deleted.count} sport(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
