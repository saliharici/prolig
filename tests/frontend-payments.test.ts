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
