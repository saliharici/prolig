import type { ReactNode } from 'react';

/**
 * Bounded, escaped visual rendering for the subset of LaTeX exported to DOCX.
 * The canonical stored source remains $...$; unsupported commands are shown
 * literally instead of being silently interpreted or deleted.
 */
const commandGlyphs: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', theta: 'θ', pi: 'π',
  Delta: 'Δ', Sigma: 'Σ', omega: 'ω', infinity: '∞', infty: '∞',
  times: '×', cdot: '·', div: '÷', pm: '±', leq: '≤', geq: '≥',
  neq: '≠', approx: '≈', sum: '∑', int: '∫'
};

function braced(source: string, position: number): { text: string; end: number } | null {
  if (source[position] !== '{') return null;
  let depth = 0;
  for (let i = position; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return { text: source.slice(position + 1, i), end: i + 1 };
    }
  }
  return null;
}

function renderExpression(source: string, depth = 0): ReactNode[] | null {
  if (depth > 8 || source.length > 180) return null;
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < source.length) {
    const current = source[i];
    if (current === '\\') {
      const match = /^\\([A-Za-z]+)/.exec(source.slice(i));
      if (!match) return null;
      const command = match[1];
      i += match[0].length;
      if (command === 'frac') {
        const numerator = braced(source, i);
        if (!numerator) return null;
        const denominator = braced(source, numerator.end);
        if (!denominator) return null;
        const n = renderExpression(numerator.text, depth + 1);
        const d = renderExpression(denominator.text, depth + 1);
        if (!n || !d) return null;
        nodes.push(<span className="prolig-math-fraction" key={i}><span className="prolig-math-num">{n}</span><span className="prolig-math-den">{d}</span></span>);
        i = denominator.end;
        continue;
      }
      if (command === 'sqrt') {
        const radicand = braced(source, i);
        if (!radicand) return null;
        const value = renderExpression(radicand.text, depth + 1);
        if (!value) return null;
        nodes.push(<span className="prolig-math-root" key={i}><span aria-hidden="true">√</span><span className="prolig-math-radicand">{value}</span></span>);
        i = radicand.end;
        continue;
      }
      const glyph = commandGlyphs[command];
      if (!glyph) return null;
      nodes.push(<span key={i}>{glyph}</span>);
      continue;
    }
    if (current === '^' || current === '_') {
      if (!nodes.length) return null;
      const group = braced(source, i + 1);
      const end = group?.end ?? i + 2;
      const value = group?.text ?? source[i + 1];
      if (!value) return null;
      const exponent = renderExpression(value, depth + 1);
      if (!exponent) return null;
      const base = nodes.pop();
      nodes.push(<span className="prolig-math-base" key={i}>{base}{current === '^' ? <sup>{exponent}</sup> : <sub>{exponent}</sub>}</span>);
      i = end;
      continue;
    }
    if (current === '{' || current === '}') return null;
    if (/[<>]/.test(current)) return null;
    nodes.push(<span key={i}>{current === '*' ? '×' : current}</span>);
    i++;
  }
  return nodes;
}

export function InlineMath({ source }: { source: string }) {
  const rendered = source && source.length <= 180 ? renderExpression(source) : null;
  return <span className={rendered ? 'prolig-math-inline' : 'prolig-math-inline prolig-math-unsupported'}
    role="math" aria-label={`Matematik ifadesi: ${source}`} title={source}>
    {rendered || `$${source}$`}
  </span>;
}

/** Compact, non-editable text for personal question cards. Never split a formula. */
export function MathSnippet({ value, maxLength = 190 }: { value: string; maxLength?: number }) {
  const fragments = value.match(/\$[^$\n]+\$|[^$]+|\$/g) || [];
  let used = 0;
  const rendered: ReactNode[] = [];
  let truncated = false;
  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    const remaining = maxLength - used;
    if (remaining <= 0 || fragment.length > remaining && fragment.startsWith('$') && fragment.endsWith('$')) {
      truncated = true;
      break;
    }
    if (fragment.startsWith('$') && fragment.endsWith('$') && fragment.length > 2) {
      rendered.push(<InlineMath key={i} source={fragment.slice(1, -1)}/>);
      used += fragment.length;
    } else {
      rendered.push(<span key={i}>{fragment.slice(0, remaining)}</span>);
      used += Math.min(fragment.length, remaining);
      if (fragment.length > remaining) { truncated = true; break; }
    }
  }
  return <>{rendered}{truncated || value.length > used ? '…' : null}</>;
}
