import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Pilot-only plan/repair. Default is READ-ONLY. Never use with real or Production data.
// Applying changes requires explicit operator approval and dedicated pilot database.
const apply = process.argv.includes('--apply');
if (!process.env.DATABASE_URL || process.env.PROLIG_PILOT_DB_CONFIRMED !== 'true') {
  throw new Error('Requires verified isolated pilot DATABASE_URL and PROLIG_PILOT_DB_CONFIRMED=true');
}
if (apply && process.env.PROLIG_PILOT_FIXTURE_REPAIR !== 'I_APPROVE_TWO_PILOT_RECORD_UPDATES') {
  throw new Error('Repair disabled. Provide explicit PROLIG_PILOT_FIXTURE_REPAIR confirmation after reviewing dry run.');
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const [writer, editor, coordinator, project, istanbul] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'pilot.yazar@prolig.local' }, select: { id: true, role: { select: { code: true } }, AuthorProfile: { select: { id: true, provinceId: true, branchId: true, districtId: true, institutionId: true, province: { select: { name: true, region: true } } } } } }),
    prisma.user.findUnique({ where: { email: 'pilot.editor@prolig.local' }, select: { id: true, role: { select: { code: true } }, editorGrade: true, editorBranchId: true, provinceId: true } }),
    prisma.user.findUnique({ where: { email: 'pilot.il@prolig.local' }, select: { role: { select: { code: true } }, provinceId: true } }),
    prisma.project.findUnique({ where: { code: 'PILOT-MAT-8-001' }, select: { id: true, targetGrade: true, branchId: true, projectAuthors: { select: { authorProfileId: true } } } }),
    prisma.province.findUnique({ where: { code: '34' }, select: { id: true, name: true, region: true } })
  ]);
  if (!writer?.AuthorProfile || !editor || !coordinator || !project || !istanbul) throw new Error('Missing canonical pilot fixture');
  if (writer.role.code !== 'YAZAR' || editor.role.code !== 'EDITOR' || coordinator.role.code !== 'IL_KOORDINATORU') throw new Error('Unexpected pilot roles');
  if (istanbul.name !== 'İstanbul' || istanbul.region !== 'Marmara' || coordinator.provinceId !== istanbul.id || editor.provinceId !== istanbul.id) {
    throw new Error('Pilot editor, province coordinator or Istanbul catalogue is inconsistent. Abort.');
  }
  const profile = writer.AuthorProfile;
  if (profile.branchId !== project.branchId || editor.editorBranchId !== project.branchId || !project.projectAuthors.some(x => x.authorProfileId === profile.id)) {
    throw new Error('Pilot branch/project assignment mismatch. Abort.');
  }
  const needProvince = profile.provinceId !== istanbul.id;
  const needGrade = editor.editorGrade !== project.targetGrade;
  if (needProvince && (profile.districtId !== null || profile.institutionId !== null)) {
    throw new Error('Author has district/institution affiliation. Manual review required before province change.');
  }
  const plan = { pilotOnly: true, mode: apply ? 'APPLY' : 'DRY_RUN', authorProvince: { from: profile.province.name, to: istanbul.name, change: needProvince }, editorGrade: { from: editor.editorGrade, to: project.targetGrade, change: needGrade }, recordsToUpdate: Number(needProvince) + Number(needGrade) };
  console.log(JSON.stringify(plan, null, 2));
  if (apply) {
    await prisma.$transaction(async tx => {
      if (needProvince) {
        const r = await tx.authorProfile.updateMany({ where: { id: profile.id, userId: writer.id, provinceId: profile.provinceId, districtId: null, institutionId: null }, data: { provinceId: istanbul.id } });
        if (r.count !== 1) throw new Error('Pilot author changed concurrently; rolled back');
      }
      if (needGrade) {
        const r = await tx.user.updateMany({ where: { id: editor.id, editorGrade: editor.editorGrade }, data: { editorGrade: project.targetGrade } });
        if (r.count !== 1) throw new Error('Pilot editor changed concurrently; rolled back');
      }
    });
    console.log('Pilot-only repair transaction COMMITTED; re-run read-only scope diagnosis and integration tests.');
  } else {
    console.log('DRY RUN ONLY. No records were modified.');
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
