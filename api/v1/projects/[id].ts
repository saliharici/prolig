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

    const rawId = req.query.id;
    if (Array.isArray(rawId) || typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const scope = buildProjectReadScope(user);
    if (scope === null) return res.status(403).json({ error: 'Forbidden' });

    const project = await prisma.project.findFirst({
      where: { AND: [scope, { id: Number(rawId) }] },
      select: projectSelect
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });
    return res.status(200).json(formatProjectDto(project));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
