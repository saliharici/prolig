import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const workspace = readFileSync('src/DemoApp.tsx', 'utf8');
const tasks = readFileSync('src/tasks/TaskTracking.tsx', 'utf8');
const styles = readFileSync('src/workspace/corporate-modules-v3b.css', 'utf8');

describe('Corporate publishing modules phase 3B', () => {
  it('keeps project details, API statistics and existing detail interaction', () => {
    expect(workspace).toContain('corporate-project-grid');
    expect(workspace).toContain('corporate-project-single');
    expect(workspace).toContain('setSelectedProjectId(project.id)');
    expect(workspace).toContain('projectQuestionStats(project.id, apiQuestions)');
  });

  it('does not show invented zero task counts on preview API errors', () => {
    expect(tasks).toContain("loading || error ? '—' : tasks.length");
    expect(tasks).toContain('{!loading && !error && <div className="task-summary-grid">');
    expect(tasks).toContain('{!loading && !error && <div className="task-toolbar">');
    expect(tasks).toContain('Bu, görev sayısının sıfır olduğu anlamına gelmez.');
    expect(tasks).toContain('previewApiUnavailable');
  });

  it('retains genuine API error reporting and retry without new write pathways', () => {
    expect(tasks).toContain('fetchTasks(projectId)');
    expect(tasks).toContain('role="alert"');
    expect(tasks).toContain('onClick={()=>void load()}');
    expect(tasks).toContain('canCreate && <button className="primary-button" onClick={openNew}');
  });

  it('scopes responsive design to the authenticated workspace', () => {
    expect(workspace).toContain("import './workspace/corporate-modules-v3b.css';");
    expect(styles).toContain('.corporate-workspace-v3 .corporate-project-single');
    expect(styles).toContain('@media (max-width:950px)');
    expect(styles).not.toContain('.public-shell');
  });
});
