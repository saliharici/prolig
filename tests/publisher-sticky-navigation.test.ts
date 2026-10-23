import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const theme = readFileSync(new URL('../src/theme/publisher-real-ui.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/DemoApp.tsx', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../src/public/PublicLanding.tsx', import.meta.url), 'utf8');
const ux02 = readFileSync(new URL('../src/public/publisher-ux02.css', import.meta.url), 'utf8');

describe('Publisher Edition sticky navigation', () => {
  it('anchors the existing authenticated command bar without changing its controls', () => {
    expect(theme).toMatch(/\.publisher-theme\.corporate-workspace-v3 \.topbar\.topbar-command\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*z-index:\s*60;/s);
    expect(app).toContain('<header className="topbar topbar-command">');
    expect(app).toContain('<main id="workspace-content" className="content"');
    expect(theme).toContain('#workspace-content {\n  scroll-margin-top: 90px;');
  });

  it('keeps public navigation sticky without trapping the document in an overflow scroll container', () => {
    expect(landing).toContain('public-shell public-v2 public-enterprise-v1 public-editorial-v2 publisher-theme');
    expect(landing).toContain('<header className="ux02-header">');
    expect(theme).toMatch(/\.publisher-theme\.public-editorial-v2\.public-shell\s*\{[^}]*overflow:\s*clip;/s);
    expect(ux02).toMatch(/\.publisher-theme\.prolig-publisher-ux02 \.ux02-header\{position:sticky;top:0;z-index:100;/);
  });

  it('preserves mobile section navigation and its anchor offset below the fixed header', () => {
    expect(landing).toContain('id="ux02-mobile-navigation"');
    expect(landing).toContain('aria-expanded={menuOpen}');
    expect(ux02).toContain('.ux02-mobile-nav{display:none;position:absolute;top:100%');
    expect(ux02).toContain('.ux02-section{scroll-margin-top:105px}');
    // UX-02 replaces the legacy fixed-offset secondary nav with an anchored menu
    // positioned immediately below its own sticky header.
    expect(theme).not.toContain('position: fixed; /* sticky header */');
  });
});
