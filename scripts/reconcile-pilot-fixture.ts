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
    prisma.user.findUnique({ where: { email: 'pilot.editor@prolig.local' }, select: { id: true, role: { select: { code: true } }, editorGrade: true, editorBranchId: true, provinceId: true, assignedRegion: true } }),
    prisma.user.findUnique({ where: { email: 'pilot.il@prolig.local' }, select: { id: true, role: { select: { code: true } }, provinceId: true } }),
    prisma.project.findUnique({ where: { code: 'PILOT-MAT-8-001' }, select: { id: true, targetGrade: true, branchId: true, projectAuthors: { select: { authorProfileId: true } } } }),
    prisma.province.findUnique({ where: { code: '34' }, select: { id: true, name: true, region: true } })
  ]);
  if (!writer?.AuthorProfile || !editor || !coordinator || !project || !istanbul) throw new Error('Missing canonical pilot fixture');
  if (writer.role.code !== 'YAZAR' || editor.role.code !== 'EDITOR' || coordinator.role.code !== 'IL_KOORDINATORU') throw new Error('Unexpected pilot roles');
  const locationPreflight = {
    istanbulCatalogueValid: istanbul.name === 'İstanbul' && istanbul.region === 'Marmara',
    coordinatorProvinceMatchesIstanbul: coordinator.provinceId === istanbul.id,
    editorGeographyCoversIstanbul: editor.provinceId !== null ? editor.provinceId === istanbul.id : editor.assignedRegion === istanbul.region,
    coordinatorProvinceId: coordinator.provinceId,
    editorProvinceId: editor.provinceId,
    editorAssignedRegion: editor.assignedRegion,
    canonicalIstanbulProvinceId: istanbul.id
  };
  console.log('Pilot location preflight (read-only):', JSON.stringify(locationPreflight, null, 2));
  if (!locationPreflight.istanbulCatalogueValid || !locationPreflight.editorGeographyCoversIstanbul) {
    throw new Error('Pilot location preflight mismatch. No writes applied; review location facts before designing any repair.');
  }
  const profile = writer.AuthorProfile;
  if (profile.branchId !== project.branchId || editor.editorBranchId !== project.branchId || !project.projectAuthors.some(x => x.authorProfileId === profile.id)) {
    throw new Error('Pilot branch/project assignment mismatch. Abort.');
  }
  // The existing author may have valid district/institution links. Preserve those links,
  // and align only the PILOT province coordinator's scope to the author instead.
  const needCoordinatorProvince = coordinator.provinceId !== profile.provinceId;
  const needGrade = editor.editorGrade !== project.targetGrade;
  const plan = { pilotOnly: true, mode: apply ? 'APPLY' : 'DRY_RUN', authorProvince: { current: profile.province.name, preserved: true, districtAndInstitutionPreserved: true }, pilotCoordinatorProvince: { fromId: coordinator.provinceId, toId: profile.provinceId, change: needCoordinatorProvince }, editorGrade: { from: editor.editorGrade, to: project.targetGrade, change: needGrade }, recordsToUpdate: Number(needCoordinatorProvince) + Number(needGrade) };
  console.log(JSON.stringify(plan, null, 2));
  if (apply) {
    await prisma.$transaction(async tx => {
      const freshAuthor = await tx.authorProfile.findUnique({ where: { id: profile.id }, select: { provinceId: true, branchId: true } });
      if (freshAuthor?.provinceId !== profile.provinceId || freshAuthor.branchId !== profile.branchId) throw new Error('Author scope changed concurrently; rolled back');
      if (needCoordinatorProvince) {
        const r = await tx.user.updateMany({ where: { id: coordinator.id, provinceId: coordinator.provinceId }, data: { provinceId: profile.provinceId } });
        if (r.count !== 1) throw new Error('Pilot coordinator changed concurrently; rolled back');
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
