import type { GeometryDrawing } from './geometry-parameters.js';
import { geometryLabelsFor } from './geometry-parameters.js';

/** Advisory-only checks. User measurements never change automatically. */
const numericAngle = (source: string): number | null => {
  const normalized = source.trim().replace(/°$/, '').trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

const numericLength = (source: string): { value: number; unit: string } | null => {
  const match = /^(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?$/.exec(source.trim());
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const factor = { mm: 0.001, cm: 0.01, m: 1 }[match[2] as 'mm' | 'cm' | 'm'] ?? 1;
  return { value: value * factor, unit: match[2] ? 'm' : '' };
};

/** Read-only geometry diagnostics, never a hard validation gate. */
export function geometryConsistencyWarnings(drawing: GeometryDrawing): string[] {
  const labels = geometryLabelsFor(drawing);
  const warnings: string[] = [];
  if (drawing.shape === 'circle') {
    const r = numericLength(labels.sides[0] ?? '');
    if (r && r.value <= 0) warnings.push('Yarıçap sıfırdan büyük olmalıdır.');
    return warnings;
  }
  const sides = labels.sides.map(numericLength);
  const angles = labels.angles.map(numericAngle);
  if (sides.some((s) => s && s.value <= 0)) warnings.push('Kenar uzunlukları sıfırdan büyük olmalıdır.');
  if (angles.some((a) => a !== null && (a <= 0 || a >= 180))) {
    warnings.push('İç açılar 0° ile 180° arasında olmalıdır.');
  }
  if (drawing.shape === 'square') {
    const knownSides = sides.filter((s): s is NonNullable<typeof s> => s !== null);
    if (knownSides.length > 1 && knownSides.every(s => s.unit === knownSides[0].unit)) {
      const first = knownSides[0].value;
      if (knownSides.some(s => Math.abs(s.value - first) > Math.max(0.0001, first * 0.01)))
        warnings.push('Karede dört kenar uzunluğu eşit olmalıdır.');
    }
    if (angles.some(a => a !== null && Math.abs(a - 90) > 0.5))
      warnings.push('Karenin bütün iç açıları 90° olmalıdır.');
    return warnings;
  }
  // Triangle: geometrically valid shape has three sides and three vertices.
  const fullAngles = angles.length === 3 && angles.every((a): a is number => a !== null) ? angles as number[] : null;
  const fullSides = sides.length === 3 && sides.every((s): s is NonNullable<typeof s> => s !== null)
    ? sides as Array<NonNullable<typeof sides[number]>> : null;
  const anglesValid = !!fullAngles && fullAngles.every(a => a > 0 && a < 180);
  if (anglesValid && Math.abs(fullAngles!.reduce((sum, a) => sum + a, 0) - 180) > 0.5)
    warnings.push('Üçgenin iç açılarının toplamı 180° olmalıdır.');
  const sideUnitsAgree = !!fullSides && fullSides.every(s => s.unit === fullSides[0].unit);
  if (sideUnitsAgree) {
    const values = fullSides!.map(s => s.value);
    const [a, b, c] = values;
    if (a + b <= c || a + c <= b || b + c <= a)
      warnings.push('Üçgen eşitsizliği sağlanmıyor: iki kenarın toplamı üçüncü kenardan büyük olmalıdır.');
    else if (anglesValid && Math.abs(fullAngles!.reduce((sum, n) => sum + n, 0) - 180) <= 0.5) {
      // Side labels: AB, BC, CA. Opposite angles A, B, C -> BC, CA, AB.
      const opposite = [b, c, a];
      const ratios = opposite.map((length, i) => length / Math.sin(fullAngles![i] * Math.PI / 180));
      const middle = ratios.reduce((sum, n) => sum + n, 0) / 3;
      if (ratios.some(n => Math.abs(n - middle) / middle > 0.05))
        warnings.push('Girilen üç kenar ile üç açı birbiriyle uyumlu görünmüyor (sinüs teoremi).');
    }
  }
  return warnings;
}
