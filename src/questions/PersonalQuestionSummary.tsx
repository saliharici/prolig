import { GeometryDiagram } from './GeometryDiagram';
import { splitGeometryMarkup } from './geometry-markup';
import type { GeometryMarkupPiece } from './geometry-markup';

const names = { triangle: 'Üçgen', circle: 'Çember', square: 'Kare' } as const;
type GeometryPiece = Extract<GeometryMarkupPiece, { kind: 'geometry' }>;

/** Display-only summary. Never changes the persisted question content. */
export function summarizePersonalQuestion(source: string, maxLength = 176) {
  const drawings: GeometryPiece[] = [];
  const words: string[] = [];
  for (const part of splitGeometryMarkup(source)) {
    if (part.kind === 'geometry') {
      drawings.push(part);
      words.push(names[part.shape]);
    } else {
      // Unsupported/future markers remain in storage, but never spill raw payload into cards.
      words.push(part.value.replace(/\[\[prolig-geometry:[^\]\r\n]{0,8192}\]\]/g,
        ' [Desteklenmeyen çizim] '));
    }
  }
  const clean = words.join(' ').replace(/<\/?u>/gi, '').replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ').trim();
  const text = clean || (drawings.length ? 'Geometrik çizim içeren soru' : 'Boş soru');
  const max = Math.max(24, Math.min(500, Math.floor(maxLength)));
  return {
    text: text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text,
    drawings,
  };
}

export function PersonalQuestionSummary({ content }: { content: string }) {
  const summary = summarizePersonalQuestion(content);
  return <div className="author-desk-question-summary">
    <p className="author-desk-question-text">{summary.text}</p>
    {summary.drawings.length > 0 && <div className="author-desk-geometry-thumbnails" aria-label="Sorudaki geometrik çizimler">
      {summary.drawings.slice(0, 3).map((part, index) => <figure key={index}>
        <GeometryDiagram shape={part.shape} values={part.values} labels={part.labels} />
        <figcaption>{names[part.shape]}</figcaption>
      </figure>)}
      {summary.drawings.length > 3 && <span className="author-desk-more-shapes">+{summary.drawings.length - 3} şekil</span>}
    </div>}
  </div>;
}
