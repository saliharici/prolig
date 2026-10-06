import { VercelRequest } from '@vercel/node';
import { prisma } from './prisma.js';
import { getSessionUserId } from './auth.js';

export async function getCurrentUser(req: VercelRequest) {
  const userId = getSessionUserId(req);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      AuthorProfile: {
        include: {
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
