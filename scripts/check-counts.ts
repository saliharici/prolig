import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
