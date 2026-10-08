export function toKurus(val: string): number {
  const str = val.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error('Malformed monetary string');
  }
  const parts = str.split('.');
  const liras = parseInt(parts[0] || '0', 10);
  const kurusStr = parts[1] ? parts[1].padEnd(2, '0') : '00';
  const kurus = parseInt(kurusStr, 10);
  return (liras * 100) + kurus;
}
