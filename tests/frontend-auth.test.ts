import { describe, it, expect } from 'vitest';
import { validateRole } from '../src/auth/api';

describe('Frontend Auth Logic', () => {
  it('validates canonical roles correctly', () => {
    expect(validateRole('YAZAR')).toBe('YAZAR');
    expect(validateRole('GENEL_KOORDINATOR')).toBe('GENEL_KOORDINATOR');
    expect(validateRole('MUHASEBE')).toBe('MUHASEBE');
  });

  it('rejects unknown or invalid roles', () => {
    expect(validateRole('YONETICI')).toBeNull();
    expect(validateRole('ADMIN')).toBeNull();
    expect(validateRole(null)).toBeNull();
    expect(validateRole(undefined)).toBeNull();
    expect(validateRole(123)).toBeNull();
  });
});
