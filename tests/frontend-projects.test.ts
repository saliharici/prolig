import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fetchProjects, ProjectApiError } from '../src/projects/api';

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
    [403, 'Projeleri görüntüleme yetkiniz yok.'],
    [500, 'Projeler yüklenemedi. Lütfen daha sonra tekrar deneyin.']
  ])('maps %s responses', async (status, message) => {
    fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) });
    await expect(fetchProjects()).rejects.toThrowError(new ProjectApiError(status as number, message as string));
  });
});

describe('Projects UI source regressions', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf8');

  it('uses API projects for the main page, overview, and grade counts', () => {
    expect(source).toContain('const [apiProjects, setApiProjects]');
    expect(source).toContain('filteredProjects = apiProjects.filter');
    expect(source).toContain('apiProjects.slice(0, 3)');
    expect(source).toContain('apiProjects.filter(project => gradesByLevel[lvl]?.includes(project.targetGrade))');
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
    expect(source).toContain('Oturum, Soru Havuzu ve Projeler gerçek Pilot verisini kullanır');
  });

  it('does not add project mutation controls or clients', () => {
    const client = fs.readFileSync(path.join(__dirname, '../src/projects/api.ts'), 'utf8');
    expect(client).not.toMatch(/createProject|updateProject|deleteProject/);
    expect(client).not.toMatch(/method:\s*['"](?:POST|PATCH|DELETE)['"]/);
  });
});
