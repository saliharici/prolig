import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { toKurus } from '../src/payments/money.js';

describe('Payment API Frontend Client', () => {
  it('has payment api client and types', () => {
    const apiPath = path.resolve(__dirname, '../src/payments/api.ts');
    const typesPath = path.resolve(__dirname, '../src/payments/types.ts');
    
    expect(fs.existsSync(apiPath)).toBe(true);
    expect(fs.existsSync(typesPath)).toBe(true);
    
    const apiCode = fs.readFileSync(apiPath, 'utf8');
    expect(apiCode).toContain('fetchPayments');
    expect(apiCode).toContain('approvePayment');
    expect(apiCode).toContain('payPayment');
  });

  it('DemoApp uses real payments through the operational Hakediş center', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const code = fs.readFileSync(demoAppPath, 'utf8');

    expect(code).not.toContain("total('Bekliyor') => data.payments");
    expect(code).toContain('function PaymentCenter(');
    expect(code).toContain('Hakediş Merkezi');
    expect(code).toContain('İŞLEM KUYRUĞU');
    expect(code).toContain('filteredPayments.map(payment =>');
    expect(code).toContain('onAdvance(payment.id, payment.status)');
    expect(code).toContain('await approvePayment(id)');
    expect(code).toContain('await payPayment(id)');
    expect(code).toContain('payments={apiPayments}');
  });

  it('provides search, status filters, workflow and real summary metrics', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const cssPath = path.resolve(__dirname, '../src/demo.css');
    const code = fs.readFileSync(demoAppPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(code).toContain("useState<'Tümü' | Payment['status']>('Tümü')");
    expect(code).toContain('Yazar, proje, kod veya sözleşme ara...');
    expect(code).toContain('Onay Bekliyor');
    expect(code).toContain('Ödeme Sırasında');
    expect(code).toContain('BU AY ÖDENEN');
    expect(code).toContain('TOPLAM HACİM');
    expect(css).toContain('.payment-kpi-grid');
    expect(css).toContain('.payment-flow-grid');
    expect(css).toContain('.payment-filter-tabs');
  });

  it('implements strict toKurus without floats', () => {
    const moneyPath = path.resolve(__dirname, '../src/payments/money.ts');
    const code = fs.readFileSync(moneyPath, 'utf8');
    
    expect(code).not.toContain('Math.round(Number(');
    expect(code).not.toContain('parseFloat');
    expect(code).toContain('parseInt(parts[0]');
    expect(code).toContain('(liras * 100) + kurus');
  });

  it('toKurus behaves correctly', () => {
    expect(toKurus("1000.00")).toBe(100000);
    expect(toKurus("10.10")).toBe(1010);
    expect(toKurus("0.01")).toBe(1);
    expect(toKurus("10.1")).toBe(1010);
    expect(toKurus("12")).toBe(1200);

    expect(() => toKurus("")).toThrow('Malformed monetary string');
    expect(() => toKurus("abc")).toThrow('Malformed monetary string');
    expect(() => toKurus("1.234")).toThrow('Malformed monetary string');
    expect(() => toKurus("10,50")).toThrow('Malformed monetary string');
    expect(() => toKurus("-1.00")).toThrow('Malformed monetary string');
    expect(() => toKurus("12x")).toThrow('Malformed monetary string');
  });
});
