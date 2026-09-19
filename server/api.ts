import { Router, Request, Response } from 'express';
import {
  getPostgresStats,
  syncPostgresAuthor,
  syncPostgresProject,
  syncPostgresTask,
  syncPostgresPayment
} from './postgres.ts';
import {
  getDashboardStats,
  getAllProvincesMap,
  getAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getPayments,
  createPayment,
  updatePaymentStatus,
  getReportsData,
  getAnnouncements,
  createAnnouncement,
  getMessages,
  createMessage,
  getFilesList,
  createFileRecord,
  getNotifications,
  markNotificationsAsRead,
  searchGlobal,
  getMetaOptions,
  seedDatabase,
  db
} from './db.ts';

export const apiRouter = Router();

// Dashboard stats endpoint (dynamically calculated from SQL)
apiRouter.get('/dashboard', (req: Request, res: Response) => {
  try {
    const role = (req.query.role as string) || undefined;
    const provinceId = req.query.province_id ? parseInt(req.query.province_id as string, 10) : undefined;
    const stats = getDashboardStats(role, provinceId);
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message || 'Veritabanı hatası' });
  }
});

// Meta select options for forms & filters
apiRouter.get('/meta', (req: Request, res: Response) => {
  try {
    const meta = getMetaOptions();
    res.json(meta);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Turkey Map distribution data
apiRouter.get('/map', (req: Request, res: Response) => {
  try {
    const mapData = getAllProvincesMap();
    res.json(mapData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Authors CRUD
apiRouter.get('/authors', (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const province_id = req.query.province_id ? parseInt(req.query.province_id as string, 10) : undefined;
    const branch_id = req.query.branch_id ? parseInt(req.query.branch_id as string, 10) : undefined;
    const status = req.query.status as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const authors = getAuthors({ search, province_id, branch_id, status, limit, offset });
    res.json(authors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/authors/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const author = getAuthorById(id);
    if (!author) {
      return res.status(404).json({ error: 'Yazar bulunamadı' });
    }
    res.json(author);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/authors', (req: Request, res: Response) => {
  try {
    const author = createAuthor(req.body);
    // Background sync to remote PostgreSQL
    syncPostgresAuthor(author).catch((e) => console.error('PG author sync error:', e));
    res.status(201).json(author);
  } catch (error: any) {
    console.error('Create author error:', error);
    res.status(400).json({ error: error.message || 'Yazar kaydedilemedi' });
  }
});

apiRouter.put('/authors/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const author = updateAuthor(id, req.body);
    syncPostgresAuthor(author).catch((e) => console.error('PG author sync error:', e));
    res.json(author);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.delete('/authors/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = deleteAuthor(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Projects CRUD
apiRouter.get('/projects', (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const branch_id = req.query.branch_id ? parseInt(req.query.branch_id as string, 10) : undefined;
    const projects = getProjects({ search, status, branch_id });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/projects', (req: Request, res: Response) => {
  try {
    const project = createProject(req.body);
    syncPostgresProject(project).catch((e) => console.error('PG project sync error:', e));
    res.status(201).json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.put('/projects/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = updateProject(id, req.body);
    syncPostgresProject(project).catch((e) => console.error('PG project sync error:', e));
    res.json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.delete('/projects/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = deleteProject(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tasks CRUD
apiRouter.get('/tasks', (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const project_id = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
    const tasks = getTasks({ status, priority, project_id });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/tasks', (req: Request, res: Response) => {
  try {
    const taskId = createTask(req.body);
    syncPostgresTask({ id: taskId, ...req.body }).catch((e) => console.error('PG task sync error:', e));
    res.status(201).json({ id: taskId, success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.patch('/tasks/:id/status', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    updateTaskStatus(id, status);
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.delete('/tasks/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    deleteTask(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Payments CRUD
apiRouter.get('/payments', (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const author_id = req.query.author_id ? parseInt(req.query.author_id as string, 10) : undefined;
    const payments = getPayments({ status, author_id });
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/payments', (req: Request, res: Response) => {
  try {
    const id = createPayment(req.body);
    syncPostgresPayment({ id, ...req.body }).catch((e) => console.error('PG payment sync error:', e));
    res.status(201).json({ id, success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.patch('/payments/:id/status', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    updatePaymentStatus(id, status);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Reports & CSV Export
apiRouter.get('/reports', (req: Request, res: Response) => {
  try {
    const reports = getReportsData();
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/reports/export-csv', (req: Request, res: Response) => {
  try {
    const authors = getAuthors({});
    const csvHeader = 'ID;Ad;Soyad;E-posta;Telefon;İl;Branş;Durum;Kayıt Tarihi\n';
    const csvRows = authors.map((a: any) => 
      `${a.id};"${a.first_name}";"${a.last_name}";"${a.email}";"${a.phone}";"${a.province_name}";"${a.branch_name}";"${a.status}";"${a.created_at}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="prolig-yazarlar-raporu.csv"');
    // Prepend UTF-8 BOM so Excel opens Turkish characters correctly
    res.send('\uFEFF' + csvHeader + csvRows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Announcements
apiRouter.get('/announcements', (req: Request, res: Response) => {
  try {
    const list = getAnnouncements();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/announcements', (req: Request, res: Response) => {
  try {
    const id = createAnnouncement(req.body);
    res.status(201).json({ id, success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Messages
apiRouter.get('/messages', (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : 1;
    const list = getMessages(userId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/messages', (req: Request, res: Response) => {
  try {
    const id = createMessage(req.body);
    res.status(201).json({ id, success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Files
apiRouter.get('/files', (req: Request, res: Response) => {
  try {
    const list = getFilesList();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/files', (req: Request, res: Response) => {
  try {
    const id = createFileRecord(req.body);
    res.status(201).json({ id, success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Notifications
apiRouter.get('/notifications', (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : 1;
    const notifs = getNotifications(userId);
    res.json(notifs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/notifications/read-all', (req: Request, res: Response) => {
  try {
    const userId = req.body.user_id || 1;
    markNotificationsAsRead(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Activity logs
apiRouter.get('/activity-logs', (req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 30').all();
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Global Search
apiRouter.get('/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const results = searchGlobal(query);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset and re-seed database endpoint
apiRouter.post('/seed/reset', (req: Request, res: Response) => {
  try {
    // Drop all tables and re-init
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS activity_logs;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS announcements;
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS files;
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS tasks;
      DROP TABLE IF EXISTS project_authors;
      DROP TABLE IF EXISTS books;
      DROP TABLE IF EXISTS projects;
      DROP TABLE IF EXISTS authors;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS institutions;
      DROP TABLE IF EXISTS branches;
      DROP TABLE IF EXISTS districts;
      DROP TABLE IF EXISTS provinces;
      DROP TABLE IF EXISTS roles;
      PRAGMA foreign_keys = ON;
    `);
    seedDatabase();
    res.json({ success: true, message: 'Veritabanı başarıyla sıfırlandı ve yeniden yüklendi.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Database connection & sync status endpoint
apiRouter.get('/database/status', async (req: Request, res: Response) => {
  try {
    const pgStats = await getPostgresStats();
    res.json({
      activeDatabase: pgStats && pgStats.connected ? 'PostgreSQL' : 'SQLite (Yerel)',
      postgres: pgStats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
