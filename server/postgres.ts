import 'dotenv/config';
import pg from 'pg';

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL;
}

export const isPostgresConfigured = () => Boolean(getDatabaseUrl());

let pool: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool | null {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false
      }
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return pool;
}

export async function testPostgresConnection(): Promise<{ connected: boolean; version?: string; host?: string; error?: string }> {
  try {
    const p = getPostgresPool();
    if (!p) return { connected: false, error: 'DATABASE_URL is not defined' };
    const res = await p.query('SELECT NOW() as now, version() as ver;');
    const dbUrl = getDatabaseUrl();
    const host = dbUrl ? dbUrl.split('@')[1]?.split('/')[0] : 'unknown';
    return {
      connected: true,
      version: res.rows[0]?.ver,
      host
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message
    };
  }
}

export async function syncPostgresAuthor(author: any) {
  const p = getPostgresPool();
  if (!p) return;
  try {
    // Generate an ID if needed
    const authorId = `auth-${author.id || Date.now()}`;
    const userId = `usr-author-${author.id || Date.now()}`;

    // Upsert User
    await p.query(`
      INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, "profilePhoto", "createdAt", "updatedAt")
      VALUES ($1, $2, '$2b$10$hashedpass123', $3, $4, 'YAZAR', $5, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email, "firstName" = EXCLUDED."firstName", "lastName" = EXCLUDED."lastName", "profilePhoto" = EXCLUDED."profilePhoto", "updatedAt" = NOW()
    `, [userId, author.email || `${author.first_name}.${author.last_name}@prolig.com.tr`, author.first_name, author.last_name, author.profile_photo || null]);

    // Upsert Author
    const statusMap: Record<string, string> = {
      'Aktif': 'AKTIF',
      'Pasif': 'PASIF',
      'Beklemede': 'BEKLEMEDE',
      'Arşiv': 'ARSIV'
    };
    const pgStatus = statusMap[author.status] || 'AKTIF';

    await p.query(`
      INSERT INTO "Author" (id, "userId", "provinceId", "branchId", "institutionId", title, experience, status, biography, phone, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        "provinceId" = EXCLUDED."provinceId",
        "branchId" = EXCLUDED."branchId",
        "institutionId" = EXCLUDED."institutionId",
        title = EXCLUDED.title,
        experience = EXCLUDED.experience,
        status = EXCLUDED.status,
        biography = EXCLUDED.biography,
        phone = EXCLUDED.phone,
        "updatedAt" = NOW()
    `, [
      authorId,
      userId,
      author.province_id || 34,
      author.branch_id || 1,
      author.institution_id || 1,
      author.title || 'Yazar',
      author.experience_years || 5,
      pgStatus,
      author.biography || '',
      author.phone || ''
    ]);
  } catch (err) {
    console.error('Error syncing author to PostgreSQL:', err);
  }
}

export async function syncPostgresProject(project: any) {
  const p = getPostgresPool();
  if (!p) return;
  try {
    const projId = `prj-${project.id || Date.now()}`;
    const statusMap: Record<string, string> = {
      'Devam Ediyor': 'DEVAM_EDIYOR',
      'Planlama': 'PLANLAMA',
      'Kontrol': 'KONTROL',
      'Tamamlandı': 'TAMAMLANDI',
      'Taslak': 'TASLAK',
      'Arşiv': 'ARSIV'
    };
    const priorityMap: Record<string, string> = {
      'Düşük': 'DUSUK',
      'Normal': 'NORMAL',
      'Yüksek': 'YUKSEK',
      'Acil': 'ACIL'
    };

    await p.query(`
      INSERT INTO "Project" (id, title, description, type, status, priority, deadline, progress, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        deadline = EXCLUDED.deadline,
        progress = EXCLUDED.progress,
        "updatedAt" = NOW()
    `, [
      projId,
      project.title,
      project.description || '',
      project.project_type || 'Soru Bankası',
      statusMap[project.status] || 'DEVAM_EDIYOR',
      priorityMap[project.priority] || 'NORMAL',
      project.deadline || '2026-12-31',
      project.progress || 0
    ]);
  } catch (err) {
    console.error('Error syncing project to PostgreSQL:', err);
  }
}

export async function syncPostgresTask(task: any) {
  const p = getPostgresPool();
  if (!p) return;
  try {
    const taskId = `tsk-${task.id || Date.now()}`;
    const statusMap: Record<string, string> = {
      'Bekliyor': 'BEKLIYOR',
      'Devam Ediyor': 'DEVAM_EDIYOR',
      'Kontrol Bekliyor': 'KONTROL_BEKLIYOR',
      'Tamamlandı': 'TAMAMLANDI',
      'Gecikti': 'GECIKTI'
    };
    const priorityMap: Record<string, string> = {
      'Düşük': 'DUSUK',
      'Normal': 'NORMAL',
      'Yüksek': 'YUKSEK',
      'Acil': 'ACIL'
    };

    await p.query(`
      INSERT INTO "Task" (id, title, description, "projectId", "authorId", "coordinatorId", status, priority, "startDate", "dueDate", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        "dueDate" = EXCLUDED."dueDate",
        "updatedAt" = NOW()
    `, [
      taskId,
      task.title,
      task.description || '',
      `prj-${task.project_id || 1}`,
      task.assigned_author_id ? `auth-${task.assigned_author_id}` : null,
      'usr-1',
      statusMap[task.status] || 'BEKLIYOR',
      priorityMap[task.priority] || 'NORMAL',
      task.due_date || '2026-10-01'
    ]);
  } catch (err) {
    console.error('Error syncing task to PostgreSQL:', err);
  }
}

export async function syncPostgresPayment(payment: any) {
  const p = getPostgresPool();
  if (!p) return;
  try {
    const payId = `pay-${payment.id || Date.now()}`;
    const statusMap: Record<string, string> = {
      'Bekliyor': 'BEKLIYOR',
      'Onaylandı': 'ONAYLANDI',
      'Ödendi': 'ODENDI',
      'İptal': 'IPTAL'
    };

    await p.query(`
      INSERT INTO "Payment" (id, "authorId", "projectId", amount, status, "paymentDate", notes, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount,
        status = EXCLUDED.status,
        "paymentDate" = EXCLUDED."paymentDate",
        notes = EXCLUDED.notes,
        "updatedAt" = NOW()
    `, [
      payId,
      `auth-${payment.author_id || 1}`,
      `prj-${payment.project_id || 1}`,
      payment.amount || 10000,
      statusMap[payment.status] || 'BEKLIYOR',
      payment.payment_date || null,
      payment.notes || ''
    ]);
  } catch (err) {
    console.error('Error syncing payment to PostgreSQL:', err);
  }
}

export async function getPostgresStats() {
  const p = getPostgresPool();
  if (!p) return null;
  try {
    const provCount = await p.query('SELECT COUNT(*) FROM "Province"');
    const authCount = await p.query('SELECT COUNT(*) FROM "Author"');
    const prjCount = await p.query('SELECT COUNT(*) FROM "Project"');
    const tskCount = await p.query('SELECT COUNT(*) FROM "Task"');
    const payCount = await p.query('SELECT COUNT(*) FROM "Payment"');
    const dbUrl = getDatabaseUrl();
    const host = dbUrl ? dbUrl.split('@')[1]?.split('/')[0] : 'unknown';

    return {
      connected: true,
      host,
      databaseType: 'PostgreSQL (Prisma Cloud / Neon)',
      counts: {
        provinces: parseInt(provCount.rows[0].count, 10),
        authors: parseInt(authCount.rows[0].count, 10),
        projects: parseInt(prjCount.rows[0].count, 10),
        tasks: parseInt(tskCount.rows[0].count, 10),
        payments: parseInt(payCount.rows[0].count, 10)
      }
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message
    };
  }
}
