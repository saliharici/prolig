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

  it('retains the existing question workflow, scoped navigation and editor implementation', () => {
    const app = file('src/DemoApp.tsx');
    expect(app).toContain('GuidedQuestionStudio');
    expect(app).toContain('onLogoutRequest()');
    expect(app).toContain('navigationGroups.map');
    expect(app).toContain('handleCreateQuestion');
    expect(app).toContain('handleYazarSubmit');
  });
});
