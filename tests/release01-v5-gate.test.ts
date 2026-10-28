import {describe,expect,it} from 'vitest';
import { v5PreviewEnabled } from '../src/publishing/publishing-v5-gate';
describe('Release 01 V5 pilot exclusion gate',()=>{
  it('refuses V5 in Production even if Preview marker is forced',()=>{
    expect(v5PreviewEnabled({VITE_VERCEL_ENV:'production',VITE_PUBLISHING_V5_PREVIEW:'true'})).toBe(false);
    expect(v5PreviewEnabled({VITE_VERCEL_ENV:'production'})).toBe(false);
  });
  it('only opens in explicit isolated Preview builds',()=>{
    expect(v5PreviewEnabled({VITE_VERCEL_ENV:'preview',VITE_PUBLISHING_V5_PREVIEW:'true'})).toBe(true);
    expect(v5PreviewEnabled({VITE_VERCEL_ENV:'preview'})).toBe(false);
  });
});
