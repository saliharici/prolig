import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { buildProjectReadScope } from '../_lib/project-access.js';
import { formatProjectDto, projectSelect } from '../_lib/project-dto.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const where = buildProjectReadScope(user);
    if (where === null) return res.status(403).json({ error: 'Forbidden' });

    const projects = await prisma.project.findMany({
      where,
      select: projectSelect,
      orderBy: [{ deadline: 'asc' }, { id: 'asc' }]
    });

    return res.status(200).json(projects.map(formatProjectDto));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
