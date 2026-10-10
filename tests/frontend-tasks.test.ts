import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createTask, deleteTask, fetchTasks, updateTask } from '../src/tasks/api';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

afterEach(() => fetchMock.mockReset());

describe('task tracking frontend', () => {
  it('uses the consolidated task API for list/create/update/delete', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: true, id: 1 }) });

    await fetchTasks(7);
    await createTask({
      title: '30 soru hazırla',
      projectId: 7,
      priority: 'Yuksek',
      startDate: '2026-10-10',
      dueDate: '2026-10-20',
      assignedAuthorProfileId: 3
    });
    await updateTask(1, { status: 'Devam_Ediyor' });
    await deleteTask(1);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/tasks?projectId=7', { credentials: 'include' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/tasks', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/tasks/1', expect.objectContaining({ method: 'PATCH' }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/v1/tasks/1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('exposes task tracking navigation, kanban/list and project drilldown', () => {
    const app = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf8');
    const task = fs.readFileSync(path.join(__dirname, '../src/tasks/TaskTracking.tsx'), 'utf8');
    const model = fs.readFileSync(path.join(__dirname, '../src/demo/model.ts'), 'utf8');
    const vercel = fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8');

    expect(model).toContain("tasks: 'Görev Takibi'");
    expect(app).toContain("{ id: 'tasks', icon: ClipboardList }");
    expect(app).toContain('openTasksForProject(selectedProject.id)');
    expect(app).toContain('selectedProject.taskCount ?? 0');
    expect(task).toContain("'kanban' | 'list'");
    expect(task).toContain('Bana Atanan');
    expect(task).toContain('Geciken');
    expect(task).toContain('Bu Hafta');
    expect(task).toContain('Yeni Görev');
    expect(vercel).toContain('/api/v1/tasks/:id');
    expect(vercel).toContain('/api/v1/tasks?action=item&id=:id');
  });
});
