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

    const rawId = req.query.id;
    if (Array.isArray(rawId) || typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
      return res.status(400).json({ error: 'Invalid author id' });
    }

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const scope = buildAuthorReadScope(user);
    if (scope === null) return res.status(403).json({ error: 'Forbidden' });

    const author = await prisma.authorProfile.findFirst({
      where: { AND: [scope, { id: Number(rawId) }, { status: 'Aktif' }, { user: { role: { code: 'YAZAR' } } }] },
      select: authorSelect
    });

    if (!author) return res.status(404).json({ error: 'Author not found' });
    return res.status(200).json(formatAuthorDto(author));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
