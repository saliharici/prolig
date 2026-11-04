import { Node as TiptapNode } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { InlineMath } from './InlineMath';

function MathView({ node, selected }: NodeViewProps) {
  const source = String(node.attrs.source || '');
  return <NodeViewWrapper as="span"
    className={'prolig-math-editable' + (selected ? ' is-selected' : '')}
    contentEditable={false} title="Denklemi seçin, sonra Seçili LaTeX ifadesini düzenle düğmesini kullanın">
    <InlineMath source={source}/>
  </NodeViewWrapper>;
}

/** Inline visual atom. The API/database still receives the original $LaTeX$ string. */
export const MathInlineNode = TiptapNode.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-prolig-math') ?? '',
        renderHTML: (attributes: { source?: string }) => ({ 'data-prolig-math': attributes.source || '' })
      }
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-prolig-math]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathView, { as: 'span' });
  }
});
