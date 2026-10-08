import { describe, expect, it } from 'vitest';
import { checkPaymentAccess } from '../api/v1/_lib/payment-access.js';
import { formatPaymentDto } from '../api/v1/_lib/payment-dto.js';

describe('Payment API Auth & DTO', () => {
  describe('Authorization', () => {
    it('allows GENEL_KOORDINATOR and MUHASEBE', () => {
      expect(checkPaymentAccess({ role: { code: 'GENEL_KOORDINATOR' } })).toBe(true);
      expect(checkPaymentAccess({ role: { code: 'MUHASEBE' } })).toBe(true);
    });

    it('rejects all other roles', () => {
      expect(checkPaymentAccess({ role: { code: 'BOLGE_KOORDINATORU' } })).toBe(false);
      expect(checkPaymentAccess({ role: { code: 'IL_KOORDINATORU' } })).toBe(false);
      expect(checkPaymentAccess({ role: { code: 'EDITOR' } })).toBe(false);
      expect(checkPaymentAccess({ role: { code: 'YAZAR' } })).toBe(false);
      expect(checkPaymentAccess({ role: { code: 'UNKNOWN' } })).toBe(false);
    });
  });

  describe('DTO formatting', () => {
    it('returns exact amount as a string without exposing private fields', () => {
      const date = new Date('2026-01-01');
      const dto = formatPaymentDto({
        id: 1,
        contractNo: 'TEST-123',
        amount: { toFixed: (n: number) => '1234.50' } as any,
        status: 'Bekliyor',
        paymentDate: null,
        createdAt: date,
        updatedAt: date,
        
        
        authorUser: { id: 10, fullName: 'Yazar Adı', email: 'secret@secret.com', passwordHash: 'secret' } as any,
        project: { id: 20, title: 'Proje 1', code: 'PRJ-1' } as any
      });

      expect(dto).toEqual({
        id: 1,
        contractNo: 'TEST-123',
        amount: '1234.50',
        status: 'Bekliyor',
        paymentDate: null,
        createdAt: date,
        updatedAt: date,
        author: { id: 10, fullName: 'Yazar Adı' },
        project: { id: 20, title: 'Proje 1', code: 'PRJ-1' }
      });
      const str = JSON.stringify(dto);
      expect(str).not.toContain('email');
      expect(str).not.toContain('passwordHash');
      expect(str).not.toContain('notes');
      expect(str).not.toContain('invoiceNo');
    });
  });
});
