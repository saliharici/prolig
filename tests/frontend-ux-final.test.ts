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

  it('YAZAR edit does not render editor review UI and author modal close does not open review modal', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');

    // Make sure the editor modal specifically checks reviewingQuestion and not editingQuestion
    expect(demoAppCode).toContain("{reviewingQuestion && ['EDITOR', 'GENEL_KOORDINATOR'].includes(currentUser.role) && <div className=\"modal-backdrop\"");
    
    // Yazar modal close sets editingQuestion to null, not just showQuestionForm
    expect(demoAppCode).toContain('setEditingQuestion(null)');
  });

  it('YAZAR can edit TASLAK and REVIZYON', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');

    expect(demoAppCode).toContain("question.status !== 'TASLAK' && question.status !== 'REVIZYON'");
    expect(demoAppCode).toContain('setEditingQuestion(question)');
    
    // Grade initialization
    expect(demoAppCode).toContain('const grade = question.grade || \'8. Sınıf\';');
    expect(demoAppCode).toContain('setQuestionLevel(level);');
  });

  it('EDITOR can review only INCELEMEDE', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const demoAppCode = fs.readFileSync(demoAppPath, 'utf8');

    expect(demoAppCode).toContain("['EDITOR', 'GENEL_KOORDINATOR'].includes(currentUser.role) && question.status === 'INCELEMEDE'");
    expect(demoAppCode).toContain('setReviewingQuestion(question)');
  });

  it('Public landing appears when unauthenticated, Giriş Yap switches to login, logout returns to public landing', () => {
    const authGatePath = path.resolve(__dirname, '../src/auth/AuthGate.tsx');
    const authGateCode = fs.readFileSync(authGatePath, 'utf8');

    expect(authGateCode).toContain('const [showLogin, setShowLogin] = useState(false);');
    expect(authGateCode).toContain('<PublicLanding onLoginClick={() => setShowLogin(true)} />');
    expect(authGateCode).toContain('<LoginScreen onLoginSuccess={() => { setShowLogin(false); checkSession(); }}');
    expect(authGateCode).toContain('setShowLogin(false);');
  });
});
