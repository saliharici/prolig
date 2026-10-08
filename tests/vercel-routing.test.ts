import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface Rewrite {
  source: string;
  destination: string;
}

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8')) as { rewrites: Rewrite[] };
const rewrites = config.rewrites;

const expectedDynamicRewrites: Rewrite[] = [
  { source: '/api/v1/health', destination: '/api/v1/management?action=health' },
  { source: '/api/v1/membership/metadata', destination: '/api/v1/management?action=metadata' },
  { source: '/api/v1/membership/applications/:id', destination: '/api/v1/management?action=application&id=:id' },
  { source: '/api/v1/membership/applications', destination: '/api/v1/management?action=applications' },
  { source: '/api/v1/users/:id', destination: '/api/v1/management?action=user&id=:id' },
  { source: '/api/v1/users', destination: '/api/v1/management?action=users' },
  { source: '/api/v1/payments/:id/approve', destination: '/api/v1/payments?action=approve&id=:id' },
  { source: '/api/v1/payments/:id/pay', destination: '/api/v1/payments?action=pay&id=:id' },
  { source: '/api/v1/questions/:id/workflow', destination: '/api/v1/questions/[id]/workflow' },
  { source: '/api/v1/questions/:id', destination: '/api/v1/questions/[id]' },
  { source: '/api/v1/authors/:id', destination: '/api/v1/authors/[id]' },
  { source: '/api/v1/projects/:id', destination: '/api/v1/projects/[id]' }
];

describe('Vercel API rewrites', () => {
  it('maps every dynamic API URL to its matching function', () => {
    expect(rewrites.slice(0, expectedDynamicRewrites.length)).toEqual(expectedDynamicRewrites);
  });

  it('puts workflow before the generic question detail mapping', () => {
    const workflowIndex = rewrites.findIndex(rewrite => rewrite.source === '/api/v1/questions/:id/workflow');
    const questionIndex = rewrites.findIndex(rewrite => rewrite.source === '/api/v1/questions/:id');
    expect(workflowIndex).toBeGreaterThanOrEqual(0);
    expect(workflowIndex).toBeLessThan(questionIndex);
  });

  it('places all dynamic mappings before the generic API and SPA fallbacks', () => {
    const apiFallbackIndex = rewrites.findIndex(rewrite => rewrite.source === '/api/(.*)');
    const spaFallbackIndex = rewrites.findIndex(rewrite => rewrite.source === '/(.*)');
    expect(apiFallbackIndex).toBeGreaterThanOrEqual(0);
    expect(spaFallbackIndex).toBeGreaterThan(apiFallbackIndex);

    for (const expected of expectedDynamicRewrites) {
      const dynamicIndex = rewrites.findIndex(rewrite => rewrite.source === expected.source);
      expect(dynamicIndex).toBeLessThan(apiFallbackIndex);
      expect(dynamicIndex).toBeLessThan(spaFallbackIndex);
    }
  });

  it('preserves the generic API rewrite used by collection and auth endpoints', () => {
    expect(rewrites).toContainEqual({ source: '/api/(.*)', destination: '/api/$1' });
    for (const collection of ['/api/v1/questions', '/api/v1/projects', '/api/v1/authors']) {
      expect(expectedDynamicRewrites.some(rewrite => rewrite.source === collection)).toBe(false);
    }
  });

  it('keeps the SPA fallback last', () => {
    expect(rewrites.at(-1)).toEqual({ source: '/(.*)', destination: '/index.html' });
  });
});


  it('limits deployable api function count to 12', () => {
    function countFunctions(dirPath: string): number {
      let count = 0;
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        if (item.name === '_lib' || item.name === 'tests') continue;
        if (item.isDirectory()) {
          count += countFunctions(path.join(dirPath, item.name));
        } else if (item.name.endsWith('.ts') && !item.name.includes('.test.')) {
          count++;
        }
      }
      return count;
    }
    const apiCount = countFunctions(path.join(__dirname, '../api'));
    expect(apiCount).toBeLessThanOrEqual(12);
  });
  