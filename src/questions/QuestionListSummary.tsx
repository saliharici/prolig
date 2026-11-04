import { MathSnippet } from './InlineMath';
import { StudioMarkup } from './StudioDocumentPreview';
import './question-list-summary.css';

/**
 * Keep canonical question markup intact. Only produce a short, readable card
 * excerpt for the publisher question list; never send this text to the API.
 */
function listExcerpt(source: string): string {
  return source
    .replace(/\[\[prolig-geometry:[^\]]{1,20000}\]\]/g, ' ◇ Geometri çizimi ')
    .replace(/\[\[prolig-(?:table|shape|image):[^\]]{1,20000}\]\]/g, ' ▤ İçerik öğesi ')
    .replace(/\*\*|__|<\/?u>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Read-only summary: details opens the full, UX-02-rendered math and geometry. */
export function QuestionListSummary({ content }: { content: string }) {
  const excerpt = listExcerpt(content);
  return <div className="prolig-question-list-summary">
    <div className="prolig-question-list-summary__excerpt" aria-label="Soru özeti">
      <MathSnippet value={excerpt || 'Soru metni bulunmuyor'} maxLength={155} />
    </div>
    <details className="prolig-question-list-summary__details">
      <summary>Tam soruyu görüntüle</summary>
      <div className="prolig-question-list-summary__body">
        <StudioMarkup value={content} />
      </div>
    </details>
  </div>;
}
