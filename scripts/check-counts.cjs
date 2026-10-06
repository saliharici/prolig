const { PrismaClient } = require('../generated/prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.user.count({ where: { email: 'integration.inactive@prolig.local' } });
  console.log("integration.inactive@prolig.local count = " + c);
  const rc = await prisma.role.count();
  console.log("roles = " + rc);
  const uc = await prisma.user.count();
  console.log("pilot users = " + uc);
  const ac = await prisma.authorProfile.count();
  console.log("YAZAR AuthorProfile = " + ac);
}
main().finally(() => prisma.$disconnect());
