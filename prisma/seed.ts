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
  // The P1-D sandbox creates its own fake identities and must never reuse
  // the original pilot user credentials file.
  const envPath = process.env.PROLIG_PILOT_CREDENTIALS_PATH
    ? path.resolve(process.env.PROLIG_PILOT_CREDENTIALS_PATH)
    : path.resolve('.local/prolig-pilot-credentials.env');
  if (process.env.PROLIG_P1D_SANDBOX_ONLY === 'true') {
    if (process.env.PROLIG_P1D_DB_NAME !== 'prolig_p1d_sandbox' ||
        envPath !== path.resolve('.local/p1d-sandbox-credentials.env') ||
        !process.env.DATABASE_URL ||
        new URL(process.env.DATABASE_URL).pathname !== '/prolig_p1d_sandbox') {
      throw new Error('P1-D sandbox seed target or dedicated credentials path is invalid.');
    }
  }
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
    { code: 'EDITOR', name: 'Editör' },
    { code: 'YAZAR', name: 'Yazar' },
    { code: 'MUHASEBE', name: 'Muhasebe' }
  ] as const;

  const usersInfo = [
    { email: 'pilot.genel@prolig.local', role: 'GENEL_KOORDINATOR' },
    { email: 'pilot.bolge@prolig.local', role: 'BOLGE_KOORDINATORU' },
    { email: 'pilot.editor@prolig.local', role: 'EDITOR' },
    { email: 'pilot.yazar@prolig.local', role: 'YAZAR' },
    { email: 'pilot.muhasebe@prolig.local', role: 'MUHASEBE' }
  ];

  // STAGE A: PREFLIGHT
  console.log('Stage A: Read-only preflight');
  
  // 1. Validate only the supported legacy pilot credentials; retired IL role is not recreated
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

  // Guard against silently keeping a stale pilot author geography/branch.
  // An existing profile is intentionally NOT overwritten by the seed.
  const existingPilotAuthor = await prisma.user.findUnique({
    where: { email: 'pilot.yazar@prolig.local' },
    select: {
      AuthorProfile: {
        select: {
          branch: { select: { name: true } },
          province: { select: { code: true, region: true } }
        }
      }
    }
  });
  if (existingPilotAuthor?.AuthorProfile) {
    const profile = existingPilotAuthor.AuthorProfile;
    if (profile.branch.name !== 'Matematik' || profile.province.region !== 'Marmara') {
      throw new Error(
        'Pilot YAZAR profile has an incompatible branch or region. ' +
        'The guarded seed preserves existing profiles; reconcile the isolated pilot fixture explicitly before rerunning.'
      );
    }
  }

  // Existing pilot author geography remains authoritative; never auto-relocate.
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
      if (u.role === 'EDITOR') {
        userCreate.editorBranch = { connect: { id: branch.id } };
        userCreate.editorGrade = '8. Sınıf';
        userCreate.assignedRegion = 'Marmara';
        userCreate.province = { connect: { id: marmara.id } };
      }
      if (u.role === 'BOLGE_KOORDINATORU') {
        userCreate.assignedRegion = 'Marmara';
      }
      user = await prisma.user.create({ data: userCreate });
    } else {
      let userUpdate: Prisma.UserUpdateInput = {
        status: 'Aktif',
        role: { connect: { id: getRoleId(u.role) } },
        assignedRegion: ['BOLGE_KOORDINATORU', 'EDITOR'].includes(u.role) ? 'Marmara' : null,
        editorBranch: u.role === 'EDITOR' ? { connect: { id: branch.id } } : { disconnect: true },
        province: { disconnect: true },
        editorGrade: u.role === 'EDITOR' ? '8. Sınıf' : null
      };
      if (action.type === 'update') {
        userUpdate.passwordHash = action.hash;
      }
      user = await prisma.user.update({
        where: { email: u.email },
        data: userUpdate
      });
    }

    if (u.role === 'EDITOR') {
      await prisma.userBranchAssignment.upsert({
        where: { userId_branchId: { userId: user.id, branchId: branch.id } },
        create: { userId: user.id, branchId: branch.id },
        update: {}
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

  const pilotYazar = await prisma.user.findUnique({
    where: { email: 'pilot.yazar@prolig.local' },
    select: { AuthorProfile: { select: { id: true } } }
  });
  if (!pilotYazar?.AuthorProfile) {
    throw new Error('Canonical Pilot YAZAR AuthorProfile is missing.');
  }

  const pilotProject = await prisma.project.upsert({
    where: { code: 'PILOT-MAT-8-001' },
    create: {
      title: '8. Sınıf Matematik Pilot Soru Bankası',
      code: 'PILOT-MAT-8-001',
      projectType: 'Soru Bankası',
      progress: 0,
      deadline: new Date('2027-06-30T00:00:00.000Z'),
      status: 'Devam_Ediyor',
      priority: 'Normal',
      targetGrade: '8. Sınıf',
      branchId: branch.id,
      description: 'Pilot V1 gerçek proje akışı için doğrulanmış örnek proje.'
    },
    update: {
      title: '8. Sınıf Matematik Pilot Soru Bankası',
      projectType: 'Soru Bankası',
      progress: 0,
      deadline: new Date('2027-06-30T00:00:00.000Z'),
      status: 'Devam_Ediyor',
      priority: 'Normal',
      targetGrade: '8. Sınıf',
      branchId: branch.id,
      description: 'Pilot V1 gerçek proje akışı için doğrulanmış örnek proje.'
    }
  });

  await prisma.projectAuthor.upsert({
    where: {
      projectId_authorProfileId: {
        projectId: pilotProject.id,
        authorProfileId: pilotYazar.AuthorProfile.id
      }
    },
    create: {
      projectId: pilotProject.id,
      authorProfileId: pilotYazar.AuthorProfile.id,
      roleInProject: 'Yazar'
    },
    update: { roleInProject: 'Yazar' }
  });

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
