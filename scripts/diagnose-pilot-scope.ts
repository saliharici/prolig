import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Read-only diagnosis. No seed, write, migration, passwords, or connection string output.
if (process.env.PROLIG_PILOT_DB_CONFIRMED !== 'true' || !process.env.DATABASE_URL) {
  console.error('Requires isolated pilot DATABASE_URL and PROLIG_PILOT_DB_CONFIRMED=true');
  process.exitCode = 2;
} else {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const [yazar, editor, il, project] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'pilot.yazar@prolig.local' }, select: { id: true, AuthorProfile: { select: { id: true, branchId: true, provinceId: true, province: { select: { name: true, region: true } } } } } }),
      prisma.user.findUnique({ where: { email: 'pilot.editor@prolig.local' }, select: { editorBranchId: true, editorGrade: true, provinceId: true, assignedRegion: true, branchAssignments: { select: { branchId: true } } } }),
      prisma.user.findUnique({ where: { email: 'pilot.il@prolig.local' }, select: { provinceId: true } }),
      prisma.project.findUnique({ where: { code: 'PILOT-MAT-8-001' }, select: { id: true, branchId: true, targetGrade: true, projectAuthors: { select: { authorProfileId: true } } } })
    ]);
    if (!yazar?.AuthorProfile || !editor || !il || !project) {
      throw new Error('A required pilot fixture is missing');
    }
    const profile = yazar.AuthorProfile;
    const editorBranches = editor.branchAssignments.map(item => item.branchId);
    if (editorBranches.length === 0 && editor.editorBranchId) editorBranches.push(editor.editorBranchId);
    const checks = {
      authorProvince: profile.province.name,
      authorRegion: profile.province.region,
      writerAndProvinceCoordinatorMatch: profile.provinceId === il.provinceId,
      writerAndEditorGeographyMatch: editor.provinceId
        ? profile.provinceId === editor.provinceId
        : Boolean(editor.assignedRegion) && profile.province.region === editor.assignedRegion,
      writerAndProjectBranchMatch: profile.branchId === project.branchId,
      editorAndProjectBranchMatch: editorBranches.includes(project.branchId),
      editorAndProjectGradeMatch: !editor.editorGrade || editor.editorGrade === project.targetGrade,
      writerAssignedToProject: project.projectAuthors.some(row => row.authorProfileId === profile.id)
    };
    console.log(JSON.stringify(checks, null, 2));
    if (Object.values(checks).some(value => value === false)) {
      console.error('Pilot fixture scope mismatch. Do not weaken authorization; reconcile test data in the isolated pilot DB only.');
      process.exitCode = 1;
    }
  } catch (e) {
    console.error('Pilot fixture diagnostic failed:', e instanceof Error ? e.message : 'unknown error');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
}
