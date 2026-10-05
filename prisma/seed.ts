import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const envPath = path.resolve('.local/prolig-pilot-credentials.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const getPass = (role: string) => {
    const match = envContent.match(new RegExp(`PILOT_${role}_PASSWORD=(.*)`));
    return match ? match[1] : 'fallback';
  };

  const rolesToSeed = [
    { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör' },
    { code: 'BOLGE_KOORDINATORU', name: 'Bölge Koordinatörü' },
    { code: 'IL_KOORDINATORU', name: 'İl Koordinatörü' },
    { code: 'EDITOR', name: 'Editör' },
    { code: 'YAZAR', name: 'Yazar' },
    { code: 'MUHASEBE', name: 'Muhasebe' }
  ];

  for (const r of rolesToSeed) {
    let existing = await prisma.role.findUnique({ where: { code: r.code } });
    if (!existing) {
      await prisma.role.create({ data: r });
    }
  }

  let marmara = await prisma.province.findUnique({ where: { code: '34' } });
  if (!marmara) {
    marmara = await prisma.province.create({ data: { id: 34, code: '34', name: 'İstanbul', region: 'Marmara' } });
  }

  let branch = await prisma.branch.findUnique({ where: { name: 'Matematik' } });
  if (!branch) {
    branch = await prisma.branch.create({ data: { name: 'Matematik', category: 'LGS' } });
  }

  const roles = await prisma.role.findMany();
  const getRoleId = (code: string) => roles.find(r => r.code === code)!.id;

  const users = [
    { email: 'pilot.genel@prolig.local', role: 'GENEL_KOORDINATOR' },
    { email: 'pilot.bolge@prolig.local', role: 'BOLGE_KOORDINATORU' },
    { email: 'pilot.il@prolig.local', role: 'IL_KOORDINATORU' },
    { email: 'pilot.editor@prolig.local', role: 'EDITOR' },
    { email: 'pilot.yazar@prolig.local', role: 'YAZAR' },
    { email: 'pilot.muhasebe@prolig.local', role: 'MUHASEBE' }
  ];

  for (const u of users) {
    const pass = getPass(u.role);
    const hash = await bcrypt.hash(pass, 10);
    
    let existingUser = await prisma.user.findUnique({ where: { email: u.email } });
    
    let userCreate: any = {
      email: u.email,
      username: u.email.split('@')[0],
      passwordHash: hash,
      fullName: 'Pilot ' + u.role,
      roleId: getRoleId(u.role),
      status: 'AKTIF'
    };

    if (u.role === 'BOLGE_KOORDINATORU') {
      userCreate.assignedRegion = 'Marmara';
    } else if (u.role === 'IL_KOORDINATORU') {
      userCreate.provinceId = marmara.id;
    }

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { email: u.email },
        data: { passwordHash: hash }
      });
    } else {
      user = await prisma.user.create({ data: userCreate });
    }

    if (u.role === 'YAZAR') {
      let existingProfile = await prisma.authorProfile.findUnique({ where: { userId: user.id } });
      if (!existingProfile) {
        await prisma.authorProfile.create({
          data: {
            userId: user.id,
            branchId: branch.id,
            provinceId: marmara.id,
            experienceYears: 5
          }
        });
      }
    }
  }

  console.log("Seed successful");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
