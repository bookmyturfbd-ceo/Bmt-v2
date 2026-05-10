import prisma from './src/lib/prisma';
async function main() {
  const orgs = await prisma.organizer.findMany({ select: { email: true } });
  console.log(orgs);
}
main();
