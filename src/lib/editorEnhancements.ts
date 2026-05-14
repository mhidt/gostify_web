import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, TextSelection, type Selection } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { switchCase } from "@/core/editor/utils";

const OPEN_QUOTE = "«";
const CLOSE_QUOTE = "»";

function charAt(doc: ProseNode, pos: number) {
  if (pos < 0 || pos >= doc.content.size) return "";
  return doc.textBetween(pos, pos + 1);
}

function lineTextBefore(doc: ProseNode, pos: number) {
  const before = doc.textBetween(0, pos, "\n", "\n");
  const lineStart = before.lastIndexOf("\n") + 1;
  return before.slice(lineStart);
}

function hasUnclosedQuote(doc: ProseNode, pos: number) {
  let depth = 0;
  for (const char of lineTextBefore(doc, pos)) {
    if (char === OPEN_QUOTE) depth += 1;
    if (char === CLOSE_QUOTE) depth -= 1;
  }
  return depth > 0;
}

export const smartQuotesPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("smart-quotes"),
    props: {
      handleTextInput(view, from, to, text) {
        if (text !== '"') return false;

        const { state } = view;
        const selectedText = state.doc.textBetween(from, to);
        const charAfter = charAt(state.doc, to);

        if (selectedText) {
          const tr = state.tr.insertText(`${OPEN_QUOTE}${selectedText}${CLOSE_QUOTE}`, from, to);
          view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + selectedText.length)));
          return true;
        }

        if (charAfter === CLOSE_QUOTE) {
          view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from + 1)));
          return true;
        }

        const pair = !charAfter || /\s/.test(charAfter);
        const insert = hasUnclosedQuote(state.doc, from) ? CLOSE_QUOTE : pair ? OPEN_QUOTE + CLOSE_QUOTE : OPEN_QUOTE;
        const nextSelection = insert.length === 2 ? from + 1 : from + insert.length;
        const tr = state.tr.insertText(insert, from, to);
        view.dispatch(tr.setSelection(TextSelection.create(tr.doc, nextSelection)));
        return true;
      },

      handleKeyDown(view, event) {
        if (event.key !== "Backspace") return false;

        const { state } = view;
        const { from, to } = state.selection;
        if (from !== to) return false;

        if (charAt(state.doc, from - 1) !== OPEN_QUOTE || charAt(state.doc, from) !== CLOSE_QUOTE) return false;

        event.preventDefault();
        view.dispatch(state.tr.delete(from - 1, from + 1));
        return true;
      },
    },
  }),
);

export const trimDoubleClickSelectionPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("trim-double-click-selection"),
    props: {
      handleDOMEvents: {
        mouseup(view, event) {
          if ((event as MouseEvent).detail !== 2) return false;

          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              const { state } = view;
              const { from, to, empty } = state.selection as Selection;
              if (empty || from >= to) return;

              const selected = state.doc.textBetween(from, to, "\n", "\n");
              const trimmedRight = selected.replace(/\s+$/u, "");
              const trimmedLeft = trimmedRight.replace(/^\s+/u, "");
              if (trimmedLeft.length === selected.length) return;

              const leading = trimmedRight.length - trimmedLeft.length;
              const nextFrom = from + leading;
              const nextTo = nextFrom + trimmedLeft.length;
              if (nextFrom >= nextTo) return;

              view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, nextFrom, nextTo)));
            });
          });

          return false;
        },
      },
      handleDoubleClick(view) {
        window.requestAnimationFrame(() => {
          const { state } = view;
          const { from, to, empty } = state.selection as Selection;
          if (empty || from >= to) return;

          const selected = state.doc.textBetween(from, to, "\n", "\n");
          const trimmed = selected.trim();
          if (trimmed.length === selected.length) return;

          const leading = selected.length - selected.trimStart().length;
          const nextFrom = from + leading;
          const nextTo = nextFrom + trimmed.length;
          view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, nextFrom, nextTo)));
        });

        return false;
      },
    },
  }),
);

export const headingMarkerPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("heading-markers"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        const { selection } = state;

        state.doc.descendants((node, pos) => {
          if (node.type.name !== "heading") return;

          const start = pos + 1;
          const end = pos + node.nodeSize;
          const cursorInside = start <= selection.from && selection.from <= end;
          if (!cursorInside) return;

          decorations.push(
            Decoration.widget(start, () => {
              const span = document.createElement("span");
              span.className = "heading-marker";
              span.textContent = `${"#".repeat(Number(node.attrs.level) || 1)} `;
              return span;
            }),
          );
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const pageBreakPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("page-break-shortcut"),
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "Enter" || !event.ctrlKey || !event.shiftKey) return false;

        event.preventDefault();
        const { from, to } = view.state.selection;
        view.dispatch(view.state.tr.insertText("\n---\n", from, to).scrollIntoView());
        return true;
      },
    },
  }),
);

export const changeCasePlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("change-case-shortcut"),
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "F3" || !event.shiftKey) return false;

        const { from, to } = view.state.selection;
        if (from === to) return false;

        event.preventDefault();
        const selected = view.state.doc.textBetween(from, to, "\n", "\n");
        const next = switchCase(selected);
        const tr = view.state.tr.insertText(next, from, to).scrollIntoView();
        view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from, from + next.length)));
        return true;
      },
    },
  }),
);

export const imagePlaceholderPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("image-placeholder"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];

        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return;

          const matches = node.text.matchAll(/\{img}/g);
          for (const match of matches) {
            const index = match.index;
            if (index === undefined) continue;
            decorations.push(Decoration.inline(pos + index, pos + index + 5, { class: "img-placeholder" }));
          }
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const editorEnhancementPlugins = [
  trimDoubleClickSelectionPlugin,
  smartQuotesPlugin,
  headingMarkerPlugin,
  pageBreakPlugin,
  changeCasePlugin,
  imagePlaceholderPlugin,
];
