import { VercelRequest } from '@vercel/node';
import { prisma } from './prisma.js';
import { getSessionClaims, hasCurrentSessionVersion } from './auth.js';

export async function getCurrentUser(req: VercelRequest) {
  const claims = getSessionClaims(req);
  const userId = claims?.userId;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      updatedAt: true,
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

  if (!user || user.status?.toUpperCase() !== 'AKTIF' || !hasCurrentSessionVersion(claims, user.updatedAt)) {
    return null;
  }

  return user;
}
