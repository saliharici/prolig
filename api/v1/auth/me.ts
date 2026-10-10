import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getSessionUserId, clearSessionCookie } from '../_lib/auth.js';

const immutableProfileFields = new Set([
  'id', 'email', 'username', 'role', 'roleId', 'status',
  'provinceId', 'districtId', 'districtName', 'assignedRegion',
  'editorBranchId', 'editorGrade', 'branchIds', 'branchId',
  'institutionId', 'iban', 'password', 'passwordHash'
]);

function cleanOptionalString(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  if (cleaned.length > max) return undefined;
  return cleaned || null;
}

function validAvatarUrl(value: string | null | undefined) {
  if (value === undefined || value === null) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const meInclude = {
  role: true,
  province: true,
  branchAssignments: { include: { branch: true } },
  AuthorProfile: {
    include: {
      branch: true,
      province: true,
      district: true,
      institution: true
    }
  }
} as const;

function userDto(user: any) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role.code,
    provinceId: user.provinceId,
    province: user.province ? {
      id: user.province.id,
      name: user.province.name,
      region: user.province.region
    } : null,
    assignedRegion: user.assignedRegion,
    editorGrade: user.editorGrade ?? null,
    editorBranches: user.branchAssignments?.map((item: any) => ({
      id: item.branch.id,
      name: item.branch.name
    })) ?? [],
    authorProfile: user.AuthorProfile ? {
      title: user.AuthorProfile.title,
      experienceYears: user.AuthorProfile.experienceYears,
      biography: user.AuthorProfile.biography ?? null,
      province: {
        id: user.AuthorProfile.province.id,
        name: user.AuthorProfile.province.name,
        region: user.AuthorProfile.province.region
      },
      district: user.AuthorProfile.district ? {
        id: user.AuthorProfile.district.id,
        name: user.AuthorProfile.district.name
      } : null,
      branch: {
        id: user.AuthorProfile.branch.id,
        name: user.AuthorProfile.branch.name
      },
      institution: user.AuthorProfile.institution ? {
        id: user.AuthorProfile.institution.id,
        name: user.AuthorProfile.institution.name
      } : null
    } : null
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'PATCH'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = getSessionUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: meInclude
    });

    if (!user || user.status?.toUpperCase() !== 'AKTIF') {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ user: userDto(user) });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const bodyKeys = Object.keys(body);

    if (bodyKeys.length === 0) {
      return res.status(400).json({ error: 'No profile fields provided' });
    }

    if (bodyKeys.some((key) => immutableProfileFields.has(key))) {
      return res.status(400).json({ error: 'Authorization and identity fields cannot be changed from profile' });
    }

    const commonAllowed = new Set(['fullName', 'phone', 'avatarUrl']);
    const authorAllowed = new Set(['title', 'experienceYears', 'biography']);
    const allowedKeys = new Set([
      ...commonAllowed,
      ...(user.role.code === 'YAZAR' ? authorAllowed : [])
    ]);

    if (bodyKeys.some((key) => !allowedKeys.has(key))) {
      return res.status(400).json({ error: 'Unsupported profile field' });
    }

    const userData: any = {};
    const authorData: any = {};

    if (Object.prototype.hasOwnProperty.call(body, 'fullName')) {
      if (typeof body.fullName !== 'string') return res.status(400).json({ error: 'Invalid fullName' });
      const fullName = body.fullName.trim();
      if (fullName.length < 2 || fullName.length > 120) return res.status(400).json({ error: 'Invalid fullName' });
      userData.fullName = fullName;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
      const phone = cleanOptionalString(body.phone, 40);
      if (phone === undefined) return res.status(400).json({ error: 'Invalid phone' });
      userData.phone = phone;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'avatarUrl')) {
      const avatarUrl = cleanOptionalString(body.avatarUrl, 500);
      if (avatarUrl === undefined || !validAvatarUrl(avatarUrl)) return res.status(400).json({ error: 'Invalid avatarUrl' });
      userData.avatarUrl = avatarUrl;
      if (user.role.code === 'YAZAR' && user.AuthorProfile) authorData.profilePhoto = avatarUrl;
    }

    if (user.role.code === 'YAZAR') {
      if (!user.AuthorProfile) return res.status(409).json({ error: 'AuthorProfile required' });

      if (Object.prototype.hasOwnProperty.call(body, 'title')) {
        const title = cleanOptionalString(body.title, 120);
        if (title === undefined || title === null) return res.status(400).json({ error: 'Invalid title' });
        authorData.title = title;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'experienceYears')) {
        const years = body.experienceYears;
        if (typeof years !== 'number' || !Number.isSafeInteger(years) || years < 0 || years > 60) {
          return res.status(400).json({ error: 'Invalid experienceYears' });
        }
        authorData.experienceYears = years;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'biography')) {
        const biography = cleanOptionalString(body.biography, 1000);
        if (biography === undefined) return res.status(400).json({ error: 'Invalid biography' });
        authorData.biography = biography;
      }
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      if (user.role.code === 'YAZAR' && Object.keys(authorData).length > 0) {
        await tx.authorProfile.update({ where: { userId }, data: authorData });
      }

      await tx.activityLog.create({
        data: {
          userName: userData.fullName ?? user.fullName,
          action: 'USER_PROFILE_UPDATED',
          entityType: 'User',
          entityId: userId,
          details: JSON.stringify({
            fields: [...Object.keys(userData), ...Object.keys(authorData)]
          })
        }
      });

      return tx.user.findUnique({
        where: { id: userId },
        include: meInclude
      });
    });

    return res.status(200).json({ user: userDto(updated) });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
