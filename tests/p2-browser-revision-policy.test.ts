import { describe, it, expect } from 'vitest';
import { validateRevisionWorkflow, REVISION_MARKER, REVISION_AUTHOR, REVISION_EDITOR } from '../scripts/p2-browser-revision-policy.js';

function fixture(overrides: Record<string, unknown> = {}) {
  const question = {
    id: 927, authorUserId: 7, status: 'TASLAK', grade: '8. Sınıf',
    objectiveCode: REVISION_MARKER, projectId: 1, questionType: 'MULTIPLE_CHOICE',
    optionCount: 4, authorUser: { email: REVISION_AUTHOR }, assets: []
  };
  return {
    enabled: true, origin: 'http://127.0.0.1:3138', expectedOrigin: 'http://127.0.0.1:3138',
    actorId: 7, actorRole: 'YAZAR', actorEmail: REVISION_AUTHOR,
    question, project: { id: 1, code: 'PILOT-MAT-8-001', branchId: 4, targetGrade: '8. Sınıf' },
    authorProjectAssigned: true, editorScopeAllowed: false,
    body: { action: 'submit' }, ...overrides
  };
}
function asEditor(q: Record<string, unknown> = {}, body: any = { action: 'request_revision', note: 'Lütfen adımları açıklayın.' }) {
  return fixture({ question: { ...fixture().question, status: 'INCELEMEDE', ...q },
    actorId: 9, actorRole: 'EDITOR', actorEmail: REVISION_EDITOR,
    editorScopeAllowed: true, body });
}
const allowed = (input: any) => expect(validateRevisionWorkflow(input)).toEqual(expect.objectContaining({ allowed: true }));

describe('P2-E browser revision safety policy — no database connection', () => {
  it('permits author submit of exact marked draft and revised question', () => {
    allowed(fixture());
    allowed(fixture({ question: { ...fixture().question, status: 'REVIZYON' } }));
    allowed(asEditor());
  });
  it('never allows approve, reject or unrelated workflow actions', () => {
    for (const action of ['approve','reject','archive','restore','delete','set_rate']) {
      expect(validateRevisionWorkflow(asEditor({}, { action, note: 'whatever' })).allowed).toBe(false);
    }
  });
  it('requires separate revision mode and exact matching loopback origin', () => {
    expect(validateRevisionWorkflow(fixture({enabled:false})).allowed).toBe(false);
    expect(validateRevisionWorkflow(fixture({origin:'http://127.0.0.1:9999'})).allowed).toBe(false);
    expect(validateRevisionWorkflow(fixture({origin:undefined})).allowed).toBe(false);
  });
  it('denies original question marker, similarly named markers and off-project questions', () => {
    for (const marker of ['P2-UAT-BROWSER-20261017','P2-UAT-REVISION-20261017FAKE',null]) {
      expect(validateRevisionWorkflow(fixture({ question: { ...fixture().question, objectiveCode:marker } })).allowed).toBe(false);
    }
    expect(validateRevisionWorkflow(fixture({ question: { ...fixture().question, projectId:999 } })).allowed).toBe(false);
    expect(validateRevisionWorkflow(fixture({ project: { ...fixture().project, code:'REAL-PROJECT' } })).allowed).toBe(false);
    expect(validateRevisionWorkflow(fixture({ question: { ...fixture().question, grade:'9. Sınıf' } })).allowed).toBe(false);
    expect(validateRevisionWorkflow(fixture({ question: { ...fixture().question, authorUser:{email:'real@example.com'} } })).allowed).toBe(false);
  });
  it('denies missing project assignment and any attached media', () => {
    expect(validateRevisionWorkflow(fixture({authorProjectAssigned:false})).allowed).toBe(false);
    expect(validateRevisionWorkflow(fixture({question:{...fixture().question,assets:[{id:1}]}})).allowed).toBe(false);
  });
  it('denies impersonation or attempts to submit in reviewer role', () => {
    expect(validateRevisionWorkflow(fixture({actorId:8})).allowed).toBe(false);
    expect(validateRevisionWorkflow(fixture({actorEmail:'stranger@example.com'})).allowed).toBe(false);
    expect(validateRevisionWorkflow(fixture({actorRole:'EDITOR'})).allowed).toBe(false);
    expect(validateRevisionWorkflow(asEditor({}, {action:'submit'})).allowed).toBe(false);
  });
  it('cannot submit an already submitted, rejected or approved question', () => {
    for (const status of ['INCELEMEDE','REDDEDILDI','ONAYLANDI']) {
      expect(validateRevisionWorkflow(fixture({question:{...fixture().question,status}})).allowed).toBe(false);
    }
  });
  it('only assigned pilot editor with branch/geography/grade scope may request revision', () => {
    expect(validateRevisionWorkflow(asEditor({}, undefined)).allowed).toBe(true);
    expect(validateRevisionWorkflow(asEditor({}, {action:'request_revision',note:'ok'})).allowed).toBe(true);
    expect(validateRevisionWorkflow(asEditor({}, {action:'request_revision',note:'ok',amount:999})).allowed).toBe(false);
    expect(validateRevisionWorkflow(asEditor({}, {action:'request_revision',note:'ok'} )).allowed).toBe(true);
    expect(validateRevisionWorkflow({ ...asEditor(), actorEmail: 'other.editor@example.com' }).allowed).toBe(false);
    expect(validateRevisionWorkflow({ ...asEditor(), editorScopeAllowed:false }).allowed).toBe(false);
  });
  it('revision reason required (1–600 characters)', () => {
    for (const note of ['', '   ', 'x'.repeat(601), undefined, null]) {
      expect(validateRevisionWorkflow(asEditor({}, {action:'request_revision',note})).allowed).toBe(false);
    }
  });
  it('cannot request revision outside INCELEMEDE', () => {
    for (const status of ['TASLAK','REVIZYON','ONAYLANDI','REDDEDILDI']) {
      expect(validateRevisionWorkflow(asEditor({status})).allowed).toBe(false);
    }
  });
  it('denies invalid bodies and unexpected payload fields including submit notes', () => {
    for (const body of [null,[],{},'submit',{action:'submit', note:'x'}, {action:'submit',status:'ONAYLANDI'}]) {
      expect(validateRevisionWorkflow(fixture({body})).allowed).toBe(false);
    }
  });
});
