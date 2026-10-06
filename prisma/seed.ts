import { PrismaClient, Prisma } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

if (process.env.PROLIG_PILOT_DB_CONFIRMED !== "true") {
  throw new Error("Pilot database safety confirmation is required.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const envPath = path.resolve('.local/prolig-pilot-credentials.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Credential file not found at ${envPath}`);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');

  const getPass = (role: string) => {
    const match = envContent.match(new RegExp(`PILOT_${role}_PASSWORD=(.*)`));
    if (!match || !match[1] || !match[1].trim()) {
      throw new Error(`Missing or empty credential for PILOT_${role}_PASSWORD`);
    }
    return match[1].trim();
  };

  const rolesToSeed = [
    { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör' },
    { code: 'BOLGE_KOORDINATORU', name: 'Bölge Koordinatörü' },
    { code: 'IL_KOORDINATORU', name: 'İl Koordinatörü' },
    { code: 'EDITOR', name: 'Editör' },
    { code: 'YAZAR', name: 'Yazar' },
    { code: 'MUHASEBE', name: 'Muhasebe' }
  ] as const;

  const usersInfo = [
    { email: 'pilot.genel@prolig.local', role: 'GENEL_KOORDINATOR' },
    { email: 'pilot.bolge@prolig.local', role: 'BOLGE_KOORDINATORU' },
    { email: 'pilot.il@prolig.local', role: 'IL_KOORDINATORU' },
    { email: 'pilot.editor@prolig.local', role: 'EDITOR' },
    { email: 'pilot.yazar@prolig.local', role: 'YAZAR' },
    { email: 'pilot.muhasebe@prolig.local', role: 'MUHASEBE' }
  ];

  // STAGE A: PREFLIGHT
  console.log('Stage A: Read-only preflight');
  
  // 1. Validate all six expected credential entries
  const credentials = new Map<string, string>();
  for (const u of usersInfo) {
    credentials.set(u.role, getPass(u.role));
  }

  // 2. Fetch existing canonical Pilot users
  const userActions = new Map<string, { type: 'create', pass: string, hash: string } | { type: 'update', hash: string } | { type: 'preserve' }>();
  for (const u of usersInfo) {
    const pass = credentials.get(u.role)!;
    const existingUser = await prisma.user.findUnique({ where: { email: u.email } });
    if (existingUser) {
      if (!existingUser.passwordHash) {
        throw new Error(`User ${u.email} unexpectedly has no passwordHash. Fail closed.`);
      }
      const isValid = await bcrypt.compare(pass, existingUser.passwordHash);
      if (!isValid) {
        if (process.env.PROLIG_ROTATE_PILOT_PASSWORDS !== 'true') {
          throw new Error(`Credential mismatch for ${u.email}. Rotation requires PROLIG_ROTATE_PILOT_PASSWORDS=true. Aborting seed.`);
        }
        userActions.set(u.email, { type: 'update', hash: await bcrypt.hash(pass, 10) });
      } else {
        userActions.set(u.email, { type: 'preserve' });
      }
    } else {
      userActions.set(u.email, { type: 'create', pass, hash: await bcrypt.hash(pass, 10) });
    }
  }

  // STAGE B: MUTATION
  console.log('Stage B: Mutation');

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

  for (const u of usersInfo) {
    const action = userActions.get(u.email)!;
    
    let user;
    if (action.type === 'create') {
      let userCreate: Prisma.UserCreateInput = {
        email: u.email,
        username: u.email.split('@')[0],
        passwordHash: action.hash,
        fullName: 'Pilot ' + u.role,
        role: { connect: { id: getRoleId(u.role) } },
        status: 'Aktif'
      };
      if (u.role === 'BOLGE_KOORDINATORU') {
        userCreate.assignedRegion = 'Marmara';
      } else if (u.role === 'IL_KOORDINATORU') {
        userCreate.province = { connect: { id: marmara.id } };
      }
      user = await prisma.user.create({ data: userCreate });
    } else {
      let userUpdate: Prisma.UserUpdateInput = {
        status: 'Aktif',
        role: { connect: { id: getRoleId(u.role) } },
        assignedRegion: u.role === 'BOLGE_KOORDINATORU' ? 'Marmara' : null,
        province: u.role === 'IL_KOORDINATORU' ? { connect: { id: marmara.id } } : { disconnect: true }
      };
      if (action.type === 'update') {
        userUpdate.passwordHash = action.hash;
      }
      user = await prisma.user.update({
        where: { email: u.email },
        data: userUpdate
      });
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
    console.error(e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
