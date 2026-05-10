import prisma from './src/lib/prisma';
async function main() {
  const orgs = await prisma.organizer.findMany();
  for (const org of orgs) {
    if (org.email !== org.email.toLowerCase().trim()) {
      await prisma.organizer.update({
        where: { id: org.id },
        data: { email: org.email.toLowerCase().trim() }
      });
      console.log(`Updated ${org.email} to ${org.email.toLowerCase().trim()}`);
    }
  }
}
main();
