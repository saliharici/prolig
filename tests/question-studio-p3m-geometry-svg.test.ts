import { describe, expect, it } from 'vitest';
import { geometryFileName, geometrySvg } from '../src/questions/geometry-svg';

describe('P3-M trusted geometry SVG export', () => {
  for (const shape of ['triangle','circle','square'] as const) {
    it('exports valid, fixed SVG for ' + shape, () => {
      const svg = geometrySvg(shape);
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');
      expect(svg).not.toMatch(/<script|<foreignObject|onload=/i);
      expect(geometryFileName(shape)).toMatch(/^prolig-geometri-.*\.svg$/);
    });
  }
});
