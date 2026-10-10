// Exact integer cents for Decimal(12,2). Never sum money as JS floating point.
export function cents(value: { toString(): string }): bigint {
  const raw = value.toString();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error('INVALID_AMOUNT');
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function decimalMoney(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}

export function sumMoney(values: { toString(): string }[]): string {
  return decimalMoney(values.reduce<bigint>((sum, value) => sum + cents(value), 0n));
}

export function paymentAmount(values: { toString(): string }[]): string {
  const total = values.reduce<bigint>((sum, value) => sum + cents(value), 0n);
  if (total <= 0n || total > 999999999999n) throw new Error('INVALID_AMOUNT');
  return decimalMoney(total);
}
