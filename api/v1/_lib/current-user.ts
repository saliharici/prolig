import { VercelRequest } from '@vercel/node';
import { prisma } from './prisma.js';
import { getSessionUserId, getSessionClaims, hasCurrentSessionVersion } from './auth.js';

export async function getCurrentUser(req: VercelRequest) {
  const userId = getSessionUserId(req);
  if (!userId) return null;
  // Existing API callers and test mocks continue using the original user ID contract.
  // When recovery is enabled, a missing/invalid version fails closed.
  const recoveryActive = process.env.UX03_RECOVERY_ENABLED === 'true' && process.env.VERCEL_ENV === 'preview';
  const claims = recoveryActive ? getSessionClaims(req) : null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      authVersion: true,
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

  if (!user || user.status?.toUpperCase() !== 'AKTIF' || (recoveryActive && !hasCurrentSessionVersion(claims, user.authVersion))) {
    return null;
  }

  return user;
}
