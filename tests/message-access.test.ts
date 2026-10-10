import { describe, expect, it } from 'vitest';
import { canMessageRecipient, canUseMessages } from '../api/v1/_lib/message-access.js';

const target = (overrides: any = {}) => ({
  id: 20,
  status: 'Aktif',
  role: { code: 'YAZAR' },
  assignedRegion: null,
  provinceId: null,
  editorBranchId: null,
  branchAssignments: [],
  province: null,
  AuthorProfile: {
    branchId: 2,
    province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' }
  },
  _count: { Payment: 0 },
  ...overrides
});

describe('message hierarchy', () => {
  it('enables messaging for canonical app roles', () => {
    for (const code of ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE']) {
      expect(canUseMessages({ role: { code } })).toBe(true);
    }
    expect(canUseMessages({ role: { code: 'UNKNOWN' } })).toBe(false);
  });

  it('prevents self-message and inactive recipients', () => {
    const actor = { id: 20, role: { code: 'GENEL_KOORDINATOR' } };
    expect(canMessageRecipient(actor, target({ id: 20 }))).toBe(false);
    expect(canMessageRecipient({ ...actor, id: 1 }, target({ status: 'Pasif' }))).toBe(false);
  });

  it('scopes region and province coordinators geographically while allowing upward communication', () => {
    const author = target();
    expect(canMessageRecipient({ id: 1, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu' }, author)).toBe(true);
    expect(canMessageRecipient({ id: 1, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' }, author)).toBe(false);

    const il = { id: 3, role: { code: 'IL_KOORDINATORU' }, provinceId: 25, messageProvince: { id: 25, region: 'Doğu Anadolu' } };
    expect(canMessageRecipient(il, author)).toBe(true);
    expect(canMessageRecipient(il, target({ role: { code: 'GENEL_KOORDINATOR' }, AuthorProfile: null }))).toBe(true);
    expect(canMessageRecipient(il, target({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu', AuthorProfile: null }))).toBe(true);
  });

  it('matches editor-author communication by branch and geography', () => {
    const editor = {
      id: 8,
      role: { code: 'EDITOR' },
      provinceId: 25,
      assignedRegion: null,
      editorBranchId: 2,
      branchAssignments: [{ branchId: 2 }],
      messageProvince: { id: 25, region: 'Doğu Anadolu' }
    };
    expect(canMessageRecipient(editor, target())).toBe(true);
    expect(canMessageRecipient(editor, target({ AuthorProfile: { branchId: 4, province: { id: 25, region: 'Doğu Anadolu' } } }))).toBe(false);

    const author = {
      id: 30,
      role: { code: 'YAZAR' },
      AuthorProfile: { branchId: 2 },
      messageProvince: { id: 25, region: 'Doğu Anadolu' }
    };
    const editorTarget = target({
      id: 9,
      role: { code: 'EDITOR' },
      provinceId: 25,
      branchAssignments: [{ branchId: 2 }],
      AuthorProfile: null,
      province: { id: 25, region: 'Doğu Anadolu' }
    });
    expect(canMessageRecipient(author, editorTarget)).toBe(true);
  });

  it('limits accounting author contacts to authors with payment history', () => {
    const accounting = { id: 99, role: { code: 'MUHASEBE' } };
    expect(canMessageRecipient(accounting, target({ _count: { Payment: 1 } }))).toBe(true);
    expect(canMessageRecipient(accounting, target({ _count: { Payment: 0 } }))).toBe(false);
    expect(canMessageRecipient(accounting, target({ role: { code: 'GENEL_KOORDINATOR' }, AuthorProfile: null }))).toBe(true);
  });
});
