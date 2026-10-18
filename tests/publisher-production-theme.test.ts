import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

describe('Publisher Edition / production visual integration', () => {
  it('applies the saved burgundy presentation to public, access, membership and workspace screens', () => {
    expect(read('src/main.tsx')).toContain("import './theme/publisher-real-ui.css'");
    for (const path of [
      'src/public/PublicLanding.tsx',
      'src/auth/LoginScreen.tsx',
      'src/membership/MembershipApplicationScreen.tsx',
      'src/DemoApp.tsx'
    ]) {
      expect(read(path), path).toContain('publisher-theme');
    }
  });

  it('keeps the original CSS overrides scoped and preserves the real P2 question editor', () => {
    const css = read('src/theme/publisher-real-ui.css');
    expect(css).toContain('.publisher-theme.public-editorial-v2');
    expect(css).toContain('.publisher-theme.prolig-access-v1');
    expect(css).toContain('.publisher-theme.corporate-workspace-v3');
    expect(css).toContain('.publisher-theme.corporate-workspace-v3 .p2-stage');
    expect(css).not.toMatch(/DATABASE_URL|AUTH_SECRET|authorization:/i);
    expect(read('src/DemoApp.tsx')).toContain('<GuidedQuestionStudio');
  });

  it('does not enable the prototype Preview unauthenticated fallback on Production', () => {
    const auth = read('src/auth/AuthGate.tsx');
    expect(auth).toContain('const user = await fetchMe()');
    expect(auth).toContain("setAuthState({ status: 'error', message: err.message");
    expect(auth).not.toContain('publisher-preview-connection-notice');
    expect(auth).not.toContain('setPreviewConnectionUnavailable(true)');
  });
});
