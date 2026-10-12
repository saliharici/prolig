import { describe, it, expect } from 'vitest';

// P0 regression: question workflow route IDs must be strictly validated.
// The current parseInt-based handler accepts trailing garbage such as "12garbage".
// This contract intentionally documents the expected secure behavior and should
// be connected to the API handler before approving the stabilization branch.
describe('Question workflow route identity requirements', () => {
  const valid = (raw: unknown) =>
    typeof raw === 'string' && /^[1-9][0-9]*$/.test(raw) && Number.isSafeInteger(Number(raw));

  it('accepts only safe positive integer IDs', () => {
    expect(valid('12')).toBe(true);
    for (const input of ['12junk', '0', '-2', '1.2', '1e2', '', '9007199254740992', ['12']]) {
      expect(valid(input)).toBe(false);
    }
  });
});
