import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { buildAuthorReadScope } from '../_lib/author-access.js';
import { authorSelect, formatAuthorDto } from '../_lib/author-dto.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const where = buildAuthorReadScope(user);
    if (where === null) return res.status(403).json({ error: 'Forbidden' });

    const authors = await prisma.authorProfile.findMany({
      where,
      select: authorSelect,
      orderBy: [{ province: { name: 'asc' } }, { user: { fullName: 'asc' } }, { id: 'asc' }]
    });

    return res.status(200).json(authors.map(formatAuthorDto));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
