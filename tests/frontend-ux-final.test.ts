import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Final UX Stabilization', () => {
  it('has independent editing and reviewing state', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');

    expect(demoAppCode).toContain('const [editingQuestion, setEditingQuestion] = useState');
    expect(demoAppCode).toContain('const [reviewingQuestion, setReviewingQuestion] = useState');
  });

  it('keeps YAZAR edit state during modal interaction and clears it on every explicit close path', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');

    expect(demoAppCode).toContain("{reviewingQuestion && ['EDITOR', 'GENEL_KOORDINATOR'].includes(currentUser.role) && <div className=\"modal-backdrop\"");

    const modalStart = demoAppCode.indexOf('{showQuestionForm && <div className="modal-backdrop"');
    const modalEnd = demoAppCode.indexOf('</form></div>}', modalStart) + '</form></div>}'.length;
    const authorModalCode = demoAppCode.substring(modalStart, modalEnd);

    expect(modalStart).toBeGreaterThan(-1);
    expect(authorModalCode).toContain('onMouseDown={event => { if (event.target === event.currentTarget) { setShowQuestionForm(false); setEditingQuestion(null); } }}');
    expect(authorModalCode).not.toContain('setShowQuestionForm(false); setEditingQuestion(null); }}><form');
    expect(authorModalCode).toContain('aria-label="Kapat" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}');
    expect(authorModalCode).toContain('className="secondary-button" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}>Vazgeç');
  });

  it('keeps edit submission on PATCH and new-question submission on create', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');
    const submitStart = demoAppCode.indexOf('const handleCreateQuestion = async');
    const submitEnd = demoAppCode.indexOf('const openQuestionForm =', submitStart);
    const submitCode = demoAppCode.substring(submitStart, submitEnd);

    expect(submitStart).toBeGreaterThan(-1);
    expect(submitCode).toMatch(/if \(editingQuestion\)[\s\S]*await patchQuestion\(editingQuestion\.id, input\);/);
    expect(submitCode).toMatch(/\} else \{[\s\S]*await createQuestion\(\{/);
  });

  it('YAZAR can edit TASLAK and REVIZYON', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');

    expect(demoAppCode).toContain("question.status !== 'TASLAK' && question.status !== 'REVIZYON'");
    expect(demoAppCode).toContain('setEditingQuestion(question)');
    
    // Grade initialization
    expect(demoAppCode).toContain("const grade = linkedProject?.targetGrade || question.grade || '8. Sınıf';");
    expect(demoAppCode).toContain('setQuestionLevel(level);');
  });

  it('EDITOR can review only INCELEMEDE and editor modal close uses setReviewingQuestion(null)', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');

    expect(demoAppCode).toContain("['EDITOR', 'GENEL_KOORDINATOR'].includes(currentUser.role) && question.status === 'INCELEMEDE'");
    expect(demoAppCode).toContain('setReviewingQuestion(question)');

    // Specifically verify modal close paths
    const startIdx = demoAppCode.indexOf('<form className="question-modal editor-review-modal"');
    const endIdx = demoAppCode.indexOf('</form></div>}', startIdx) + '</form></div>}'.length;
    const backdropStartIdx = demoAppCode.lastIndexOf('<div className="modal-backdrop"', startIdx);
    
    const editorModalCode = demoAppCode.substring(backdropStartIdx, endIdx);
    expect(editorModalCode).toContain('setReviewingQuestion(null)');
    expect(editorModalCode).not.toContain('setEditingQuestion(null)');
  });

  it('Public landing appears when unauthenticated, Giriş Yap switches to login, logout returns to public landing', () => {
    const authGatePath = path.resolve(__dirname, '../src/auth/AuthGate.tsx');
    const authGateCode = fs.readFileSync(authGatePath, 'utf8');

    expect(authGateCode).toContain('const [showLogin, setShowLogin] = useState(false);');
    expect(authGateCode).toContain('const [showApplication, setShowApplication] = useState(false);');
    expect(authGateCode).toContain('<MembershipApplicationScreen onBack={() => setShowApplication(false)} />');
    expect(authGateCode).toContain('<PublicLanding onLoginClick={() => setShowLogin(true)} onApplyClick={() => setShowApplication(true)} />');
    expect(authGateCode).toContain('const [showPublicPreview, setShowPublicPreview] = useState(false);');
    expect(authGateCode).toContain('<PublicLanding');
    expect(authGateCode).toContain('authenticated');
    expect(authGateCode).toContain('onPublicSiteRequest={() => setShowPublicPreview(true)}');
    expect(authGateCode).toContain('<LoginScreen onLoginSuccess={() => { setShowLogin(false); checkSession(); }}');
    expect(authGateCode).toContain('setShowLogin(false);');
  });


  it('uses the searchable command topbar and keeps corporate page access', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');
    const cssPath = path.resolve(__dirname, '../src/demo.css');
    const cssCode = fs.readFileSync(cssPath, 'utf8');

    expect(demoAppCode).toContain('topbar-command');
    expect(demoAppCode).toContain('topbar-global-search');
    expect(demoAppCode).toContain('topbarQuickSections');
    expect(demoAppCode).toContain('onPublicSiteRequest');
    expect(demoAppCode).toContain('runTopbarSearch');
    expect(cssCode).toContain('.topbar-command{');
    expect(cssCode).toContain('.topbar-command-actions');
  });

  it('keeps role settings general-only and exposes member management only to coordinators', () => {
    const modelPath = path.resolve(__dirname, '../src/demo/model.ts');
    const modelCode = fs.readFileSync(modelPath, 'utf8');
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');

    expect(modelCode).toContain("GENEL_KOORDINATOR: ['overview', 'grades', 'questions', 'projects', 'tasks', 'messages', 'authors', 'reports', 'payments', 'members', 'roles', 'audit']");
    expect(modelCode).toContain("BOLGE_KOORDINATORU: ['overview', 'questions', 'projects', 'tasks', 'messages', 'authors', 'grades', 'reports', 'members', 'payments']");
    expect(modelCode).toContain("IL_KOORDINATORU: ['overview', 'grades', 'questions', 'projects', 'tasks', 'messages', 'authors', 'reports', 'members', 'payments']");
    expect(modelCode).toContain("EDITOR: ['overview', 'grades', 'questions', 'projects', 'tasks', 'messages', 'reports', 'payments']");
    expect(modelCode).toContain("YAZAR: ['overview', 'grades', 'questions', 'projects', 'tasks', 'messages', 'reports', 'payments']");
    expect(modelCode).toContain("MUHASEBE: ['overview', 'payments', 'projects', 'messages', 'reports']");
    expect(demoAppCode).toContain("{section === 'members'");
    expect(demoAppCode).toContain("{section === 'roles' && currentUser.role === 'GENEL_KOORDINATOR'");
    expect(demoAppCode).not.toContain("{section === 'roles' && <MemberManagement");
  });

  it('enriches the login screen with platform capabilities and production flow', () => {
    const loginPath = path.resolve(__dirname, '../src/auth/LoginScreen.tsx');
    const loginCode = fs.readFileSync(loginPath, 'utf8');
    const cssPath = path.resolve(__dirname, '../src/demo.css');
    const cssCode = fs.readFileSync(cssPath, 'utf8');

    expect(loginCode).toContain('Proje Yönetimi');
    expect(loginCode).toContain('Görev Takibi');
    expect(loginCode).toContain('İçerik Üretimi');
    expect(loginCode).toContain('Ekip İletişimi');
    expect(loginCode).toContain('PROJE');
    expect(loginCode).toContain('GÖREV');
    expect(loginCode).toContain('ÜRETİM');
    expect(loginCode).toContain('KONTROL');
    expect(loginCode).toContain('YAYIN');
    expect(cssCode).toContain('.soft-login-capabilities');
    expect(cssCode).toContain('.soft-login-flow');
  });

  it('Landing page copy is accurate and neutral', () => {
    const landingPath = path.resolve(__dirname, '../src/public/PublicLanding.tsx');
    const landingCode = fs.readFileSync(landingPath, 'utf8');

    // canonical project title is present
    expect(landingCode).toContain('8. Sınıf Matematik Pilot Soru Bankası');
    
    // unsupported "8. Sınıf LGS Soru Bankası" is absent
    expect(landingCode).not.toContain('8. Sınıf LGS Soru Bankası');

    // neutral truthful label
    expect(landingCode).toContain('Pilot Yazar Ağı');
    
    // unsupported "Ülke Geneli" claim is absent
    expect(landingCode).not.toContain('Ülke Geneli');
  });
});

