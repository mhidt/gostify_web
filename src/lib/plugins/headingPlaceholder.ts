import type { Node } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

const headingPlaceholders: Record<number, string> = {
  1: 'Заголовок 1',
  2: 'Заголовок 2',
  3: 'Заголовок 3',
  4: 'Заголовок 4',
}

const placeholderPluginKey = new PluginKey('heading-placeholder')

export const headingPlaceholderPlugin = $prose(() => {
  return new Plugin({
    key: placeholderPluginKey,
    props: {
      decorations(state) {
        const { doc, selection } = state
        const decorations: Decoration[] = []

        doc.descendants((node: Node, pos: number) => {
          if (node.type.name === 'heading' && node.content.size === 0) {
            const level = node.attrs.level as number
            const text = headingPlaceholders[level] ?? `Заголовок ${level}`

            const isFocused =
              selection.$anchor.pos >= pos &&
              selection.$anchor.pos <= pos + node.nodeSize

            if (isFocused) {
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: 'empty-heading-placeholder',
                  'data-placeholder': text,
                }),
              )
            }
          }
        })

        return DecorationSet.create(doc, decorations)
      },
    },
  })
})
