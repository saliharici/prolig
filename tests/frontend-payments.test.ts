import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

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

  it('DemoApp uses real payments', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const code = fs.readFileSync(demoAppPath, 'utf8');
    
    expect(code).not.toContain("total('Bekliyor') => data.payments");
    expect(code).toContain('moneyKurus(sumPayments(apiPayments');
    expect(code).toContain('apiPayments.map(payment =>');
    expect(code).toContain('updatePayment(payment.id');
    expect(code).toContain('await approvePayment(id)');
    expect(code).toContain('await payPayment(id)');
  });
});


  it('implements strict toKurus without floats', () => {
    const demoAppPath = path.resolve(__dirname, '../src/DemoApp.tsx');
    const code = fs.readFileSync(demoAppPath, 'utf8');
    
    expect(code).not.toContain('Math.round(Number(');
    expect(code).not.toContain('parseFloat');
    expect(code).toContain('parseInt(parts[0]');
    expect(code).toContain('(liras * 100) + kurus');
  });
