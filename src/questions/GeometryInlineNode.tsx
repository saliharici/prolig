import { Node as TiptapNode } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { GeometryDiagram } from './GeometryDiagram';
import { readGeometryMarker } from './geometry-parameters';

/**
 * A visual, atomic in-stem representation of an existing geometry marker.
 * The stored question value still uses the established v1/v2 text format;
 * no schema migration or change to the Word exporter is required.
 */
function GeometryShapeView({ node, selected }: NodeViewProps) {
  const marker = typeof node.attrs.marker === 'string' ? node.attrs.marker : '';
  const drawing = readGeometryMarker(marker);
  if (!drawing) return <NodeViewWrapper as="span" className="release07-inline-geometry-error" contentEditable={false}>Geçersiz geometrik çizim</NodeViewWrapper>;
  return <NodeViewWrapper as="span" className={'release07-inline-geometry'+(selected?' is-selected':'')}
    contentEditable={false} title="Geometrik şekil: Kayıtlı şekiller bölümünden düzenleyin"
    aria-label="Soruya eklenmiş geometrik şekil">
    <GeometryDiagram shape={drawing.shape} values={drawing.values}/>
  </NodeViewWrapper>;
}

export const GeometryInlineNode = TiptapNode.create({
  name: 'geometryShape',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      marker: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const marker = element.getAttribute('data-prolig-geometry');
          return marker && readGeometryMarker(marker) ? marker : null;
        },
        renderHTML: (attributes: { marker?: string }) => ({
          'data-prolig-geometry': attributes.marker
        })
      }
    };
  },
  parseHTML() {
    return [{
      tag: 'span[data-prolig-geometry]',
      getAttrs: (element: HTMLElement) => {
        const marker = element.getAttribute('data-prolig-geometry');
        return marker && readGeometryMarker(marker) ? {} : false;
      }
    }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes];
  },
  addNodeView() {
    return ReactNodeViewRenderer(GeometryShapeView, { as: 'span' });
  }
});
