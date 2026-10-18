import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const theme = readFileSync(new URL('../src/theme/publisher-real-ui.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/DemoApp.tsx', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../src/public/PublicLanding.tsx', import.meta.url), 'utf8');

describe('Publisher Edition sticky navigation', () => {
  it('anchors the existing authenticated command bar without changing its controls', () => {
    expect(theme).toMatch(/\.publisher-theme\.corporate-workspace-v3 \.topbar\.topbar-command\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*z-index:\s*60;/s);
    expect(app).toContain('<header className="topbar topbar-command">');
    expect(app).toContain('<main id="workspace-content" className="content"');
    expect(theme).toContain('#workspace-content {\n  scroll-margin-top: 90px;');
  });

  it('keeps public navigation sticky without trapping the document in an overflow scroll container', () => {
    expect(landing).toContain('public-shell public-v2 public-enterprise-v1 public-editorial-v2 publisher-theme');
    expect(landing).toContain('<header className="public-header">');
    expect(theme).toMatch(/\.publisher-theme\.public-editorial-v2\.public-shell\s*\{[^}]*overflow:\s*clip;/s);
    expect(theme).toMatch(/\.publisher-theme\.public-editorial-v2 \.public-header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/s);
  });

  it('preserves mobile section navigation and its anchor offset below the fixed header', () => {
    expect(landing).toContain('className="public-mobile-nav"');
    expect(theme).toContain('top: var(--prolig-public-header-height);');
    expect(theme).toContain('scroll-margin-top: calc(var(--prolig-public-header-height) + 58px);');
    expect(theme).toContain('--prolig-public-header-height: 70px;');
    expect(theme).not.toContain('position: fixed; /* sticky header */');
  });
});
