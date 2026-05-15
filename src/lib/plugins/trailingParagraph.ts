import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";

const trailingPluginKey = new PluginKey('trailing-paragraph')

export const trailingParagraphPlugin = $prose(() => {
  return new Plugin({
    key: trailingPluginKey,
    appendTransaction(_, __, newState) {
      const { doc, tr, schema } = newState
      const lastNode = doc.lastChild
      if (!lastNode || lastNode.type.name !== 'paragraph' || lastNode.content.size !== 0) {
        const paragraphType = schema.nodes.paragraph
        if (!paragraphType) return null
        const paragraph = paragraphType.create()
        return tr.insert(doc.content.size, paragraph)
      }
      return null
    },
  })
})
