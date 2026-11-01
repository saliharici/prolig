import type { ReactNode } from 'react';
import type { QuestionAssetPlacement } from './types';
import type { StudioBlock, StudioDocumentV1, StudioInline } from './studio-document';
import { parseStudioInline, parseStudioBlocks } from './studio-document';
import { splitGeometryMarkup } from './geometry-markup';
import { GeometryDiagram } from './GeometryDiagram';

/**
 * Non-editable, React-escaped proof of concept. Never uses dangerouslySetInnerHTML.
 * Math markup is displayed as accessible TeX source for now; full typesetting is
 * a separate P1 acceptance gate, not an implemented capability.
 */
function renderInline(nodes: StudioInline[]): ReactNode {
  return nodes.map((node, i) => {
    const key = `inline-${i}`;
    switch (node.kind) {
      case 'bold': return <strong key={key}>{renderInline(parseStudioInline(node.text))}</strong>;
      case 'italic': return <em key={key}>{renderInline(parseStudioInline(node.text))}</em>;
      case 'underline': return <u key={key}>{renderInline(parseStudioInline(node.text))}</u>;
      case 'math': return <code key={key} className="studio-math-source" aria-label={`Matematik ifadesi: ${node.text}`}>{node.text}</code>;
      case 'link': return <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">{renderInline(parseStudioInline(node.text))}</a>;
      default: {
        // Preserve the exact pre-P3 HTML tree for ordinary text formatting.
        // Only geometry-bearing nodes require a mixed text / SVG tree.
        if (!node.text.includes('[[prolig-geometry:')) return <span key={key}>{node.text}</span>;
        return <span key={key}>{splitGeometryMarkup(node.text).map((piece, j) =>
          piece.kind === 'geometry'
            ? <GeometryDiagram key={j} shape={piece.shape} values={piece.values}/>
            : <span key={j}>{piece.value}</span>
        )}</span>;
      }
    }
  });
}

function renderBlocks(blocks: StudioBlock[], prefix: string): ReactNode {
  return blocks.map((block, index) => {
    const key = `${prefix}-${index}`;
    if (block.kind === 'paragraph') return <p key={key}>{renderInline(block.children)}</p>;
    if (block.kind === 'list') {
      const listItems = block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>);
      return block.ordered ? <ol key={key}>{listItems}</ol> : <ul key={key}>{listItems}</ul>;
    }
    return <div key={key} className="studio-table-scroll" role="region" aria-label="Soru tablosu" tabIndex={0}>
      <table className="studio-content-table">
        <thead><tr>{block.columns.map((column, i) => <th key={i} scope="col">{renderInline(parseStudioInline(column))}</th>)}</tr></thead>
        <tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{renderInline(parseStudioInline(cell))}</td>)}</tr>)}</tbody>
      </table>
    </div>;
  });
}

export function StudioMarkup({ value }: { value: string }) {
  return <div className="formatted-question-text">{renderBlocks(parseStudioBlocks(value), 'markup')}</div>;
}

export function StudioDocumentPreview({
  document,
  renderAssets,
  previewNote
}: {
  document: StudioDocumentV1;
  renderAssets?: (placement: QuestionAssetPlacement) => ReactNode;
  previewNote?: string;
}) {
  return <article className="question-preview-card studio-p1-preview" aria-label="Yapılandırılmış soru önizlemesi">
    <div className="studio-preview-note">
      {previewNote || 'P1 deneysel önizleme · mevcut kayıt biçimi korunur'}
    </div>
    <div className="formatted-question-text">{renderBlocks(document.stem, 'stem')}</div>
    {renderAssets?.('STEM')}
    <ol className="studio-choices" type="A">
      {document.choices.map((blocks, index) => {
        const letter = String.fromCharCode(65 + index);
        return <li key={letter} className={document.legacy.correctAnswer === letter ? 'correct' : ''}>
          {blocks.length ? renderBlocks(blocks, `choice-${letter}`) : `${letter} seçeneği`}
          {renderAssets?.(`OPTION_${letter}` as QuestionAssetPlacement)}
        </li>;
      })}
    </ol>
    {document.legacy.explanation.trim() && <section className="question-preview-solution" aria-label="Çözüm">
      <strong>Çözüm</strong>
      <div className="formatted-question-text compact">{renderBlocks(document.explanation, 'explanation')}</div>
      {renderAssets?.('EXPLANATION')}
    </section>}
  </article>;
}
