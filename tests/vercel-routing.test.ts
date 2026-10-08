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
