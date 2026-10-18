import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const landing = fs.readFileSync(path.join(__dirname, '../src/public/PublicLanding.tsx'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../src/public/public-enterprise-v1.css'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));

describe('PRO-LIG institutional editorial landing v2', () => {
  it('preserves operational callbacks, membership, and section anchors', () => {
    expect(landing).toContain('onLoginClick');
    expect(landing).toContain('onApplyClick');
    for (const id of ['platform', 'projeler', 'nasil-calisir', 'yayin-projesi']) {
      expect(landing).toContain(`id="${id}"`);
    }
    expect(landing).toContain('public-mobile-nav');
    expect(landing).not.toContain('/api/v1/');
  });

  it('isolates public CSS from existing dashboard, login and P2 styles', () => {
    expect(landing).toContain('public-shell public-v2 public-enterprise-v1 public-editorial-v2');
    expect(landing).toContain("import './public-enterprise-v1.css'");
    expect(css).toContain('.public-v2.public-enterprise-v1.public-editorial-v2');
    expect(css).not.toContain('.demo-sidebar');
    expect(css).not.toContain('.soft-login-shell');
  });

  it('uses an explicitly illustrative proof page and accessible semantic layout', () => {
    expect(landing).toContain('Temsili ürün görünümü');
    expect(landing).toContain('Ana içeriğe geç');
    expect(landing).toContain('id="public-content"');
    expect(landing).toContain('<ol className="editorial-process-steps">');
    expect(css).toContain('prefers-reduced-motion');
    expect(landing).not.toContain('public-feature-card');
    expect(landing).not.toContain('public-v2-process-card');
  });

  it('keeps branch-specific preview deployments disabled', () => {
    expect(config.git.deploymentEnabled['feat/p2-professional-question-editor-20261012']).toBe(false);
    expect(config.git.deploymentEnabled['feature/corporate-landing-v1-20261014']).toBe(false);
  });
});
