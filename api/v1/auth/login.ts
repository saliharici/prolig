import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { prisma } from '../_lib/prisma.js';
import { setSessionCookie } from '../_lib/auth.js';


const TEST_BRANCH = 'feat/branch-coordinator-v3-20261027';
const TEST_ADMIN_EMAIL = 'preview-admin@prolig.invalid';

function testBootstrapEnabled() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.PROLIG_TEST_ADMIN_SETUP !== 'enabled') return false;
  if (process.env.VERCEL_GIT_COMMIT_REF && process.env.VERCEL_GIT_COMMIT_REF !== TEST_BRANCH) return false;
  try {
    const host = new URL(process.env.DATABASE_URL || '').hostname;
    return !!host && host === process.env.PROLIG_TEST_DATABASE_HOST;
  } catch { return false; }
}

async function setupIsolatedTestAdmin(req: VercelRequest, res: VercelResponse) {
  if (!testBootstrapEnabled()) return res.status(404).json({ error: 'Not found' });
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'TEST şifresi 10-128 karakter olmalı.' });
  }
  const target = await prisma.$queryRaw<Array<{ name: string; db_user: string }>>`
    SELECT current_database() AS name, current_user AS db_user
  `;
  if (target[0]?.name !== 'ux02_test' || target[0]?.db_user !== 'ux02_owner') {
    return res.status(403).json({ error: 'Not an isolated TEST database' });
  }
  const hash = await bcrypt.hash(password, 10);
  const created = await prisma.$transaction(async tx => {
    const existing = await tx.user.findUnique({ where: { email: TEST_ADMIN_EMAIL }, select: { id: true } });
    if (existing) return null;
    let role = await tx.role.findUnique({ where: { code: 'GENEL_KOORDINATOR' } });
    if (!role) role = await tx.role.create({
      data: { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör', description: 'İzole TEST yönetici hesabı' }
    });
    return tx.user.create({ data: {
      username: TEST_ADMIN_EMAIL, email: TEST_ADMIN_EMAIL, passwordHash: hash,
      fullName: 'PRO-LIG TEST Genel Koordinatör', status: 'Aktif', roleId: role.id
    }});
  });
  if (!created) return res.status(409).json({ error: 'TEST hesabı zaten var. Normal giriş yapın.' });
  setSessionCookie(res, created.id);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({ created: true, email: TEST_ADMIN_EMAIL });
}


const TEST_BRANCH_COORDINATOR_EMAIL = 'preview-brans@prolig.invalid';

async function setupIsolatedTestCoordinator(req: VercelRequest, res: VercelResponse) {
  if (!testBootstrapEnabled()) return res.status(404).json({ error: 'Not found' });
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'TEST şifresi 10-128 karakter olmalı.' });
  }
  const dbIdentity=await prisma.$queryRaw<Array<{ name:string; db_user:string }>>`
    SELECT current_database() AS name, current_user AS db_user
  `;
  if(dbIdentity[0]?.name!=='ux02_test'||dbIdentity[0]?.db_user!=='ux02_owner') {
    return res.status(403).json({ error:'TEST veritabanı tanınmadı.' });
  }
  const user=await prisma.user.findUnique({
    where:{email:TEST_BRANCH_COORDINATOR_EMAIL},
    include:{role:true}
  });
  if(!user || user.role.code!=='BRANS_KOORDINATORU' || user.status.toUpperCase()!=='AKTIF')
    return res.status(404).json({error:'TEST branş koordinatörü bulunamadı.'});
  if(user.passwordHash) return res.status(409).json({error:'Branş hesabının şifresi zaten oluşturuldu.'});
  const hash=await bcrypt.hash(password,10);
  // Atomic claim: never overwrite a password already set by a previous request.
  const updated=await prisma.user.updateMany({
    where:{id:user.id,passwordHash:null},
    data:{passwordHash:hash}
  });
  if(updated.count!==1) return res.status(409).json({error:'Branş hesabının şifresi zaten oluşturuldu.'});
  setSessionCookie(res,user.id);
  res.setHeader('Cache-Control','no-store');
  return res.status(201).json({created:true,email:TEST_BRANCH_COORDINATOR_EMAIL});
}


// Dedicated, disposable TEST actors: password claim is one-time and never overwrites a real user's password.
const TEST_FIXTURE_ACTORS = {
  matAuthor: { email: 'prolig-fixture-mat1@prolig.invalid', role: 'YAZAR', provinceId: 6, branchId: 50 },
  fizAuthor: { email: 'prolig-fixture-fiz1@prolig.invalid', role: 'YAZAR', provinceId: 25, branchId: 23 },
  matEditor: { email: 'preview-editor-mat@prolig.invalid', role: 'EDITOR', provinceId: 6, branchId: 50, grade: '7. Sınıf' },
  fizEditor: { email: 'preview-editor-fiz@prolig.invalid', role: 'EDITOR', provinceId: 25, branchId: 23, grade: '10. Sınıf' }
} as const;

async function setupIsolatedFixtureActor(req: VercelRequest, res: VercelResponse, actorKeyOverride?: keyof typeof TEST_FIXTURE_ACTORS) {
  if (!testBootstrapEnabled()) return res.status(404).json({ error: 'Not found' });
  const password = req.body?.password;
  const actorKey: unknown = actorKeyOverride ?? req.body?.testFixtureActor;
  if (typeof actorKey !== 'string' || !Object.prototype.hasOwnProperty.call(TEST_FIXTURE_ACTORS, actorKey)) {
    return res.status(400).json({ error: 'Geçersiz TEST rolü.' });
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'TEST şifresi 10-128 karakter olmalı.' });
  }
  const target = await prisma.$queryRaw<Array<{ name: string; db_user: string }>>`
    SELECT current_database() AS name, current_user AS db_user
  `;
  if (target[0]?.name !== 'ux02_test' || target[0]?.db_user !== 'ux02_owner') {
    return res.status(403).json({ error: 'İzole TEST veritabanı tanınmadı.' });
  }
  const actor = TEST_FIXTURE_ACTORS[actorKey as keyof typeof TEST_FIXTURE_ACTORS];
  const user = await prisma.user.findUnique({
    where: { email: actor.email },
    include: {
      role: true,
      AuthorProfile: { select: { branchId: true, provinceId: true } },
      branchAssignments: { select: { branchId: true } }
    }
  });
  if (!user || user.status.toUpperCase() !== 'AKTIF' || user.role.code !== actor.role) {
    return res.status(404).json({ error: 'Örnek TEST hesabı bulunamadı.' });
  }
  if (actor.role === 'YAZAR' &&
      (user.AuthorProfile?.branchId !== actor.branchId || user.AuthorProfile?.provinceId !== actor.provinceId)) {
    return res.status(403).json({ error: 'Örnek yazarın branş/il bilgisi değişmiş.' });
  }
  if (actor.role === 'EDITOR' &&
      (user.provinceId !== actor.provinceId || user.editorGrade !== ('grade' in actor ? actor.grade : undefined)
        || !user.branchAssignments.some(a => a.branchId === actor.branchId))) {
    return res.status(403).json({ error: 'Örnek editörün yetki ataması değişmiş.' });
  }
  if (user.passwordHash) return res.status(409).json({ error: 'Bu TEST hesabının şifresi zaten belirlenmiş.' });
  const hash = await bcrypt.hash(password, 10);
  const updated = await prisma.user.updateMany({
    where: { id: user.id, passwordHash: null },
    data: { passwordHash: hash }
  });
  if (updated.count !== 1) return res.status(409).json({ error: 'Bu TEST hesabının şifresi zaten belirlenmiş.' });
  setSessionCookie(res, user.id);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({ created: true, email: actor.email });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (req.body?.testAdminSetup === true) {
      return await setupIsolatedTestAdmin(req, res);
    }
    if (req.body?.testCoordinatorSetup === true) {
      return await setupIsolatedTestCoordinator(req, res);
    }
    if (req.body?.testFixtureSetup === true) {
      return await setupIsolatedFixtureActor(req, res);
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { email, password } = req.body;
    
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password must be strings' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail || !password.trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true }
    });

    // Dedicated synthetic accounts have no initial password. Their first normal
    // login claims the TEST-only account, then subsequent logins use bcrypt.
    // Never enable this flow for real accounts, Production, or other databases.
    if (user && user.status?.toUpperCase() === 'AKTIF' && !user.passwordHash) {
      const testActor = (Object.keys(TEST_FIXTURE_ACTORS) as Array<keyof typeof TEST_FIXTURE_ACTORS>)
        .find(key => TEST_FIXTURE_ACTORS[key].email === normalizedEmail);
      if (testActor && testBootstrapEnabled()) {
        return await setupIsolatedFixtureActor(req, res, testActor);
      }
    }
    if (!user || user.status?.toUpperCase() !== 'AKTIF' || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    setSessionCookie(res, user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.code,
        provinceId: user.provinceId,
        assignedRegion: user.assignedRegion
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
