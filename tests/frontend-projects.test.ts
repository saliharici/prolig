import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { changeProjectLifecycle, createProject, deleteProject, fetchProjects, ProjectApiError, updateProject } from '../src/projects/api';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('Project API frontend client', () => {
  beforeEach(() => fetchMock.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('fetches projects with the session cookie', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, code: 'PILOT-MAT-8-001' }] });
    await expect(fetchProjects()).resolves.toEqual([{ id: 1, code: 'PILOT-MAT-8-001' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/projects', { credentials: 'include' });
  });

  it.each([
    [401, 'Oturum süresi dolmuş veya yetkisiz.'],
    [403, 'Bu proje işlemi için yetkiniz yok.'],
    [500, 'Projeler işlenemedi. Lütfen daha sonra tekrar deneyin.']
  ])('maps %s responses', async (status, message) => {
    fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) });
    await expect(fetchProjects()).rejects.toThrow(message as string);
  });

  it('creates, updates, archives and deletes projects through existing endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 11 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 11 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 11, status: 'Arsiv' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: true, id: 11 }) });

    const createInput = {
      title: '8. Sınıf Matematik',
      code: 'MAT-8-2027',
      projectType: 'Soru Bankası',
      deadline: '2027-06-30',
      priority: 'Normal' as const,
      targetGrade: '8. Sınıf',
      branchId: 2,
      description: null,
      authorProfileIds: [3]
    };

    await createProject(createInput);
    await updateProject(11, { progress: 25, status: 'Planlama', authorProfileIds: [3] });
    await changeProjectLifecycle(11, 'archive');
    await deleteProject(11);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/projects', expect.objectContaining({ method: 'POST', credentials: 'include' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/projects/11', expect.objectContaining({ method: 'PATCH', credentials: 'include' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/projects/11', expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'archive' }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/v1/projects/11', expect.objectContaining({ method: 'DELETE', credentials: 'include' }));
  });
});

describe('Projects UI source regressions', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf8');

  it('uses API projects for the main page, overview, and centralized grade summaries', () => {
    expect(source).toContain('const [apiProjects, setApiProjects]');
    expect(source).toContain('filteredProjects = apiProjects.filter');
    expect(source).toContain('apiProjects.slice(0, 3)');
    expect(source).toContain('buildGradeLevelSummary(gradesByLevel[lvl] ?? [], apiAuthors, apiProjects, apiQuestions)');
  });

  it('renders real code and status mapping without fabricating project province', () => {
    expect(source).toContain('<span className="project-code">{project.code}</span>');
    expect(source).toContain("Devam_Ediyor: 'Devam Ediyor'");
    expect(source).not.toContain('{project.branch.name} · {project.targetGrade} · {project.province}');
  });

  it('has loading, error, empty, retry, and truthful transparency copy', () => {
    expect(source).toContain('projectsLoading');
    expect(source).toContain('projectsError');
    expect(source).toContain('loadApiProjects');
    expect(source).toContain('Proje bulunamadı.');
    expect(source).toContain('Oturum, Soru Havuzu, Projeler ve Yazar Ağı gerçek Pilot verisini kullanır');
  });

  it('integrates project cards, class drilldown and project detail without fake counters', () => {
    expect(source).toContain('projectQuestionStats(project.id, apiQuestions)');
    expect(source).toContain('project.authors.length');
    expect(source).toContain('13 Sınıf Düzeyi');
    expect(source).toContain('buildGradeDetail(selectedGrade, apiProjects, apiQuestions)');
    expect(source).toContain('openProjectsForGrade(selectedGrade)');
    expect(source).toContain('openQuestionsForProject(selectedProject.id)');
    expect(source).toContain('PROJE DETAYI');
  });

  it('adds coordinator project management without creating a separate project-management endpoint', () => {
    const client = fs.readFileSync(path.join(__dirname, '../src/projects/api.ts'), 'utf8');
    const modal = fs.readFileSync(path.join(__dirname, '../src/projects/ProjectManagementModal.tsx'), 'utf8');
    expect(client).toContain('createProject');
    expect(client).toContain('updateProject');
    expect(client).toContain('changeProjectLifecycle');
    expect(client).toContain('deleteProject');
    expect(source).toContain('Yeni Proje');
    expect(source).toContain('Projeyi Düzenle');
    expect(source).toContain('<ProjectManagementModal');
    expect(modal).toContain('Proje yazarları');
    expect(modal).toContain('Arşivden Çıkar');
    expect(modal).toContain('Kalıcı Sil');
  });
});
