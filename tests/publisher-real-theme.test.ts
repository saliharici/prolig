import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const file = (name: string) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const guard = "import.meta.env.VITE_PUBLISHER_PRESENTATION_THEME === 'true'";

describe('publisher edition theme / production-safe rollout contract', () => {
  it('is enabled only through a Vite preview build flag on real PRO-LİG screens', () => {
    for (const path of [
      'src/public/PublicLanding.tsx',
      'src/auth/LoginScreen.tsx',
      'src/membership/MembershipApplicationScreen.tsx',
      'src/DemoApp.tsx'
    ]) {
      const source = file(path);
      expect(source, path).toContain(guard);
      expect(source, path).toContain('publisher-theme');
    }
  });

  it('loads one isolated CSS theme without routing or authentication bypasses', () => {
    const main = file('src/main.tsx');
    const authGate = file('src/auth/AuthGate.tsx');
    expect(authGate).toContain("import.meta.env.VITE_PUBLISHER_PRESENTATION_THEME === 'true'");
    expect(authGate).toContain("setPreviewConnectionUnavailable(true)");
    expect(authGate).toContain("setAuthState({ status: 'unauthenticated' })");
    expect(authGate).toContain("publisher-preview-connection-notice");
    expect(authGate).toContain("setAuthState({ status: 'error', message: err.message");
    expect(main).toContain("import './theme/publisher-real-ui.css'");
    expect(main).toContain('<AuthGate />');
    expect(main).not.toContain('PublishingPresentationConcept');
    const css = file('src/theme/publisher-real-ui.css');
    expect(css).toContain('.publisher-theme.corporate-workspace-v3');
    expect(css).toContain('.publisher-theme.public-editorial-v2');
    expect(css).toContain('.publisher-theme.prolig-access-v1');
    expect(css).not.toMatch(/DATABASE_URL|AUTH_SECRET|fetch\s*\(|localStorage\s*\(/);
  });

  it('uses authorProfile branch from verified session in the real P2 editor, never an undeclared field', () => {
    const app = file('src/DemoApp.tsx');
    const types = file('src/auth/types.ts');
    expect(types).toContain('authorProfile?:');
    expect(types).toContain('branch: { id: number; name: string };');
    expect(app).toContain("currentUser.authorProfile?.branch.name ?? ''");
    expect(app).not.toContain("(currentUser as any).branchName");
  });

  it('overrides guided P2 authoring palette only beneath the preview publisher theme', () => {
    const css = file('src/theme/publisher-real-ui.css');
    expect(css).toContain('.publisher-theme.corporate-workspace-v3 .p2-steps button[aria-current="step"]');
    expect(css).toContain('.publisher-theme.corporate-workspace-v3 .p2-stage');
    expect(css).toContain('.publisher-theme.corporate-workspace-v3 .p2-option-tabs button[aria-selected="true"]');
    expect(css).toContain('.publisher-theme.corporate-workspace-v3 .p2-boolean');
    expect(css).toContain('.publisher-theme.corporate-workspace-v3 .p2-guided button:focus-visible');
    expect(css).not.toMatch(/(^|\\n)\\s*\\.p2-steps button\\s*\\{/);
  });

  it('retains the existing question workflow, scoped navigation and editor implementation', () => {
    const app = file('src/DemoApp.tsx');
    expect(app).toContain('GuidedQuestionStudio');
    expect(app).toContain('onLogoutRequest()');
    expect(app).toContain('navigationGroups.map');
    expect(app).toContain('handleCreateQuestion');
    expect(app).toContain('handleYazarSubmit');
  });
});
