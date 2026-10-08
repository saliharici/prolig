import { VercelRequest } from '@vercel/node';
import { prisma } from './prisma.js';
import { getSessionUserId } from './auth.js';

export async function getCurrentUser(req: VercelRequest) {
  const userId = getSessionUserId(req);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      status: true,
      assignedRegion: true,
      provinceId: true,
      editorBranchId: true,
      editorGrade: true,
      branchAssignments: { select: { branchId: true } },
      role: true,
      AuthorProfile: {
        select: {
          id: true,
          branchId: true,
          provinceId: true,
          branch: true
        }
      }
    }
  });

  if (!user || user.status?.toUpperCase() !== 'AKTIF') {
    return null;
  }

  return user;
}
