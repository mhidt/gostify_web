import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";

const softBreakPluginKey = new PluginKey('soft-break')

export const softBreakPlugin = $prose(() => {
  return new Plugin({
    key: softBreakPluginKey,
    props: {
      handleKeyDown(view, event) {
        if (event.key === 'Enter' && event.shiftKey) {
          const { state, dispatch } = view
          const { schema, tr } = state

          const br = schema.nodes.hardbreak?.create()
          if (!br) return false

          dispatch(tr.replaceSelectionWith(br).scrollIntoView())
          return true
        }
        return false
      },
    },
  })
})
