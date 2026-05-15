import { InputRule } from "@milkdown/kit/prose/inputrules";
import { $inputRule } from "@milkdown/kit/utils";

export const markdownShortcutsPlugin = $inputRule(() => {
  return new InputRule(
    /^(#{1,6})\s$/,
    (state, match, start, end) => {
      const marker = match[1];
      if (!marker) return null;
      const level = marker.length
      const { tr, schema } = state
      const headingType = schema.nodes.heading
      if (!headingType) return null
      return tr.delete(start, end).setBlockType(start, start, headingType, { level })
    },
  )
})
