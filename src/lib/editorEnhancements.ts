import { Fragment, type Node as ProseNode } from "@milkdown/kit/prose/model";
import { NodeSelection, Plugin, PluginKey, TextSelection, type Selection } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet, type EditorView, type NodeView } from "@milkdown/kit/prose/view";
import { $prose, $remark } from "@milkdown/kit/utils";
import { switchCase } from "@/core/editor/utils";
import { DEFAULT_SETTINGS, type DocxPluginSettings } from "@/core/settings";

const OPEN_QUOTE = "«";
const CLOSE_QUOTE = "»";
const HEADING_EXCLUSIONS = [
  "введение",
  "заключение",
  "список использованных источников",
  "содержание",
];
type EditorDisplaySettings = Pick<
  DocxPluginSettings,
  "captionSeparator" | "chapterDot" | "chapterPrefix" | "imageShortCaption" | "paragraphDot"
>;

let editorDisplaySettings: EditorDisplaySettings = {
  chapterDot: DEFAULT_SETTINGS.chapterDot,
  chapterPrefix: DEFAULT_SETTINGS.chapterPrefix,
  captionSeparator: DEFAULT_SETTINGS.captionSeparator,
  imageShortCaption: DEFAULT_SETTINGS.imageShortCaption,
  paragraphDot: DEFAULT_SETTINGS.paragraphDot,
};

export function setEditorDisplaySettings(settings: EditorDisplaySettings): void {
  editorDisplaySettings = settings;
}

function getCaptionPrefix(number: number): string {
  const label = editorDisplaySettings.imageShortCaption ? "Рис." : "Рисунок";
  const separator = editorDisplaySettings.captionSeparator === "dash" ? " \u2013" : ".";
  return `${label} ${number}${separator} `;
}

function getElementCaptionPrefix(label: "Листинг" | "Таблица", number: number): string {
  const separator = editorDisplaySettings.captionSeparator === "dash" ? " \u2013" : ".";
  return `${label} ${number}${separator} `;
}

function getPlainHeadingText(node: ProseNode): string {
  return node.textContent.trim().replace(/^\d+(\.\d+)*\.?\s+/, "");
}

function isExcludedHeading(node: ProseNode): boolean {
  return HEADING_EXCLUSIONS.includes(getPlainHeadingText(node).toLowerCase());
}

function hasHeadingNumberPrefix(node: ProseNode): boolean {
  return /^\d+(\.\d+)*\.?\s+/.test(node.textContent.trim());
}

function getChapterPrefix(number: number): string {
  const word = editorDisplaySettings.chapterPrefix ? "Глава " : "";
  const separator = editorDisplaySettings.chapterDot ? ". " : " ";
  return `${word}${number}${separator}`;
}

function getParagraphPrefix(number: string): string {
  const separator = editorDisplaySettings.paragraphDot ? ". " : " ";
  return `${number}${separator}`;
}

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

function containsImageNode(node: ProseNode) {
  if (node.type.name === "image") return true;

  let found = false;
  node.descendants((child) => {
    if (child.type.name === "image") {
      found = true;
      return false;
    }

    return !found;
  });

  return found;
}

function isEmptyParagraph(node: ProseNode) {
  return node.type.name === "paragraph" && node.textContent.trim().length === 0;
}

function isStandaloneImageParagraph(node: ProseNode) {
  return node.type.name === "paragraph" && node.childCount === 1 && node.child(0).type.name === "image";
}

function isPageBreakParagraph(node: ProseNode) {
  return node.type.name === "paragraph" && node.textContent.trim() === "---";
}

function hasCaptionPrefix(text: string) {
  return /^Рис(?:унок|\.)\s+\d+(?:\.\d+)?(?:\.|\s+\u2013|-)\s+/u.test(text.trim());
}

function hasTableCaptionPrefix(text: string) {
  return /^Таблица\s+\d+(?:\.|\s+\u2013|-)\s+/u.test(text.trim());
}

function getListingCaptionFromLanguage(language: unknown): string {
  if (typeof language !== "string") return "";
  return language.trim().replace(/^\S+\s*/, "").trim();
}

export const codeBlockMetaPlugin = $remark("code-block-meta", () => () => (tree) => {
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;

    const current = node as { type?: string; lang?: unknown; meta?: unknown; children?: unknown[] };
    if (current.type === "code" && typeof current.meta === "string" && current.meta.trim()) {
      current.lang = `${typeof current.lang === "string" ? current.lang : ""} ${current.meta.trim()}`.trim();
      current.meta = undefined;
    }

    current.children?.forEach(visit);
  };

  visit(tree);
});

function parseImageAlt(alt: unknown): { baseAlt: string; requestedWidth?: number } {
  const text = typeof alt === "string" ? alt : "";
  const pipeIndex = text.lastIndexOf("|");
  if (pipeIndex === -1) return { baseAlt: text };

  const baseAlt = text.slice(0, pipeIndex).trim();
  const requestedWidth = parseInt(text.slice(pipeIndex + 1), 10);
  return {
    baseAlt: baseAlt || text,
    requestedWidth: Number.isFinite(requestedWidth) ? requestedWidth : undefined,
  };
}

function clampImageWidth(width: number, maxWidth: number): number {
  return Math.round(Math.max(80, Math.min(width, maxWidth)));
}

class ResizableImageView implements NodeView {
  dom: HTMLElement;
  private image: HTMLImageElement;
  private node: ProseNode;
  private view: EditorView;
  private getPos: () => number | undefined;

  constructor(node: ProseNode, view: EditorView, getPos: (() => number | undefined) | boolean) {
    this.node = node;
    this.view = view;
    this.getPos = typeof getPos === "function" ? getPos : () => undefined;

    this.dom = document.createElement("span");
    this.dom.className = "resizable-image-node";
    this.dom.setAttribute("contenteditable", "false");

    this.image = document.createElement("img");
    this.image.draggable = false;
    this.dom.appendChild(this.image);

    this.dom.appendChild(this.createHandle("top-left", "left"));
    this.dom.appendChild(this.createHandle("top-right", "right"));
    this.dom.appendChild(this.createHandle("bottom-left", "left"));
    this.dom.appendChild(this.createHandle("bottom-right", "right"));
    this.dom.addEventListener("mousedown", this.selectImage);
    this.render();
  }

  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false;

    this.node = node;
    this.render();
    return true;
  }

  selectNode(): void {
    this.dom.classList.add("is-selected");
  }

  deselectNode(): void {
    this.dom.classList.remove("is-selected");
  }

  stopEvent(event: Event): boolean {
    return this.dom.contains(event.target as HTMLElement);
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    this.dom.removeEventListener("mousedown", this.selectImage);
  }

  private render(): void {
    const { src, title } = this.node.attrs;
    const { baseAlt, requestedWidth } = parseImageAlt(this.node.attrs.alt);

    this.image.src = typeof src === "string" ? src : "";
    this.image.alt = baseAlt;
    this.image.title = typeof title === "string" ? title : "";
    this.image.style.width = requestedWidth ? `${requestedWidth}px` : "";
  }

  private createHandle(corner: "top-left" | "top-right" | "bottom-left" | "bottom-right", side: "left" | "right"): HTMLElement {
    const handle = document.createElement("span");
    handle.className = `resizable-image-handle resizable-image-handle-${corner}`;
    handle.addEventListener("mousedown", (event) => this.startResize(event, side));
    return handle;
  }

  private selectImage = (event: MouseEvent): void => {
    event.preventDefault();
    const pos = this.getPos();
    if (typeof pos !== "number") return;

    this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos)));
    this.view.focus();
  };

  private startResize(event: MouseEvent, side: "left" | "right"): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectImage(event);

    const startX = event.clientX;
    const startWidth = this.image.getBoundingClientRect().width;
    const maxWidth = Math.max(80, this.dom.parentElement?.clientWidth ?? startWidth);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = side === "right" ? startWidth + delta : startWidth - delta;
      this.image.style.width = `${clampImageWidth(nextWidth, maxWidth)}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      this.commitWidth(this.image.getBoundingClientRect().width);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  private commitWidth(width: number): void {
    const pos = this.getPos();
    if (typeof pos !== "number") return;

    const { baseAlt } = parseImageAlt(this.node.attrs.alt);
    const nextAlt = `${baseAlt}|${clampImageWidth(width, this.dom.parentElement?.clientWidth ?? width)}`;
    const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
      ...this.node.attrs,
      alt: nextAlt,
    });

    this.view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, pos)));
  }
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
            Decoration.widget(
              start,
              () => {
                const span = document.createElement("span");
                span.className = "heading-marker";
                span.textContent = `${"#".repeat(Number(node.attrs.level) || 1)} `;
                span.setAttribute("aria-hidden", "true");
                span.setAttribute("contenteditable", "false");
                return span;
              },
              { side: -1 },
            ),
          );
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const headingFormattingPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("heading-formatting"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        let chapterNumber = 0;
        let paragraphNumber = 0;
        let hasChapter = false;

        state.doc.descendants((node, pos) => {
          if (node.type.name !== "heading") return;

          const level = Number(node.attrs.level) || 1;
          if (level !== 1 && level !== 2) return;

          const isChapter = level === 1;
          const className = isChapter ? "editor-chapter-heading" : "editor-paragraph-heading";
          if (isChapter && hasChapter) {
            decorations.push(
              Decoration.widget(
                pos,
                () => {
                  const div = document.createElement("div");
                  div.className = "chapter-page-break";
                  div.setAttribute("contenteditable", "false");
                  div.setAttribute("aria-label", "Разрыв страницы");
                  return div;
                },
                { side: -1 },
              ),
            );
          }
          if (isChapter) hasChapter = true;

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: className,
            }),
          );

          if (isExcludedHeading(node)) return;

          let prefix = "";
          if (isChapter) {
            chapterNumber += 1;
            paragraphNumber = 0;
            prefix = getChapterPrefix(chapterNumber);
          } else {
            paragraphNumber += 1;
            prefix = getParagraphPrefix(chapterNumber === 0 ? `${paragraphNumber}` : `${chapterNumber}.${paragraphNumber}`);
          }

          if (hasHeadingNumberPrefix(node)) return;

          decorations.push(
            Decoration.widget(
              pos + 1,
              () => {
                const span = document.createElement("span");
                span.className = "heading-number-prefix";
                span.textContent = prefix;
                span.setAttribute("contenteditable", "false");
                return span;
              },
              { side: -1 },
            ),
          );
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const pageBreakDisplayPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("page-break-display"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];

        state.doc.forEach((node, offset) => {
          if (!isPageBreakParagraph(node)) return;

          decorations.push(
            Decoration.node(offset, offset + node.nodeSize, {
              class: "editor-page-break",
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
        const { schema, selection } = view.state;
        const { from, to, empty, $from } = selection;

        if (empty) {
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (node.type.name !== "bullet_list" && node.type.name !== "ordered_list") continue;

            const paragraph = schema.nodes.paragraph;
            if (!paragraph) break;

            const breakParagraph = paragraph.create(null, schema.text("---"));
            const nextParagraph = paragraph.create();
            const insertPos = $from.after(depth);
            const tr = view.state.tr.insert(insertPos, Fragment.fromArray([breakParagraph, nextParagraph]));
            view.dispatch(tr.setSelection(TextSelection.create(tr.doc, insertPos + breakParagraph.nodeSize + 1)).scrollIntoView());
            return true;
          }
        }

        view.dispatch(view.state.tr.insertText("\n---\n", from, to).scrollIntoView());
        return true;
      },
    },
  }),
);

export const saveShortcutPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("save-shortcut"),
    props: {
      handleKeyDown(_view, event) {
        if (!(event.ctrlKey || event.metaKey) || event.code !== "KeyS") return false;

        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("gostify-save"));
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

type PlaceholderType = "img" | "listing" | "table";

function getPlaceholderLabel(type: PlaceholderType, number: number | null): string {
  const value = number ?? "?";
  if (type === "img") return `(${editorDisplaySettings.imageShortCaption ? "рис." : "рисунок"} ${value})`;
  if (type === "listing") return `(листинг ${value})`;
  return `(таблица ${value})`;
}

function findPreviousElementNumber(elements: Array<{ pos: number; number: number }>, pos: number): number | null {
  let found: number | null = null;
  for (const element of elements) {
    if (element.pos >= pos) break;
    found = element.number;
  }
  return found;
}

function findReferencedElementNumber(elements: Array<{ pos: number; number: number }>, pos: number): number | null {
  return findPreviousElementNumber(elements, pos) ?? elements.find((element) => element.pos > pos)?.number ?? null;
}

export const elementPlaceholderPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("element-placeholder"),
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return false;

          const placeholder = target.closest<HTMLElement>(".element-placeholder");
          if (!placeholder) return false;

          const start = Number(placeholder.dataset.elementStart);
          if (!Number.isFinite(start)) return false;

          event.preventDefault();
          view.focus();
          view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, start + 1)));
          return true;
        },
      },
      decorations(state) {
        const decorations: Decoration[] = [];
        const elements: Record<PlaceholderType, Array<{ pos: number; number: number }>> = {
          img: [],
          listing: [],
          table: [],
        };
        const { from: selectionFrom, to: selectionTo } = state.selection;

        state.doc.forEach((node, offset) => {
          if (containsImageNode(node)) {
            elements.img.push({ pos: offset, number: elements.img.length + 1 });
          }
          if (node.type.name === "code_block") {
            elements.listing.push({ pos: offset, number: elements.listing.length + 1 });
          }
          if (node.type.name === "table") {
            elements.table.push({ pos: offset, number: elements.table.length + 1 });
          }
        });

        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return;

          const matches = node.text.matchAll(/\{(img|table|listing)}/g);
          for (const match of matches) {
            const index = match.index;
            if (index === undefined) continue;
            const type = match[1] as PlaceholderType;
            const from = pos + index;
            const to = from + match[0].length;
            const selectionTouchesPlaceholder = selectionFrom <= to && selectionTo >= from;
            if (selectionTouchesPlaceholder) {
              decorations.push(
                Decoration.inline(from, to, {
                  class: "element-placeholder-editing",
                }),
              );
              continue;
            }

            const elementNumber = findReferencedElementNumber(elements[type], from);
            decorations.push(
              Decoration.inline(from, to, {
                class: "element-placeholder",
                "data-element-label": getPlaceholderLabel(type, elementNumber),
                "data-element-start": String(from),
              }),
            );
          }
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const imagePlaceholderPlugin = elementPlaceholderPlugin;

export const listingCaptionPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("listing-caption"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        let listingNumber = 0;

        state.doc.forEach((node, offset) => {
          if (node.type.name === "code_block") {
            listingNumber += 1;
            const caption = getListingCaptionFromLanguage(node.attrs.language);
            decorations.push(
              Decoration.node(offset, offset + node.nodeSize, {
                class: "listing-code-block",
              }),
            );

            if (!caption) return;

            decorations.push(
              Decoration.widget(
                offset,
                () => {
                  const div = document.createElement("div");
                  div.className = "listing-caption";
                  div.setAttribute("contenteditable", "false");

                  const prefix = document.createElement("span");
                  prefix.className = "listing-caption-prefix";
                  prefix.textContent = getElementCaptionPrefix("Листинг", listingNumber);
                  div.append(prefix, caption);
                  return div;
                },
                { side: -1 },
              ),
            );
          }
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const tableCaptionPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("table-caption"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        let tableNumber = 0;
        let previousNode: ProseNode | null = null;
        let previousOffset = 0;

        state.doc.forEach((node, offset) => {
          if (node.type.name === "table") {
            tableNumber += 1;
            decorations.push(
              Decoration.node(offset, offset + node.nodeSize, {
                class: "gost-table",
              }),
            );

            if (previousNode?.type.name === "paragraph" && previousNode.textContent.trim().length > 0) {
              decorations.push(
                Decoration.node(previousOffset, previousOffset + previousNode.nodeSize, {
                  class: "gost-table-caption",
                }),
              );

              if (!hasTableCaptionPrefix(previousNode.textContent)) {
                decorations.push(
                  Decoration.widget(
                    previousOffset + 1,
                    () => {
                      const span = document.createElement("span");
                      span.className = "gost-table-caption-prefix";
                      span.textContent = getElementCaptionPrefix("Таблица", tableNumber);
                      span.setAttribute("contenteditable", "false");
                      return span;
                    },
                    { side: -1 },
                  ),
                );
              }
            }
          }

          previousNode = node;
          previousOffset = offset;
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const bibliographyPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("bibliography"),
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return false;

          if (target instanceof HTMLInputElement && target.classList.contains("bib-url-input")) {
            event.stopPropagation();
            return false;
          }

          const link = target.closest<HTMLElement>(".bib-link, .bib-ref");
          const href = link?.dataset.bibHref;
          if (!href || !(event as MouseEvent).ctrlKey) return false;

          event.preventDefault();
          window.open(href, "_blank", "noopener,noreferrer");
          view.focus();
          return true;
        },
        keydown(view, event) {
          const target = event.target;
          if (!(target instanceof HTMLInputElement) || !target.classList.contains("bib-url-input")) return false;

          if ((event as KeyboardEvent).key === "Escape") {
            event.preventDefault();
            view.focus();
            return true;
          }

          if ((event as KeyboardEvent).key !== "Enter") return false;
          event.preventDefault();
          commitLinkHref(view, target);
          return true;
        },
        focusout(view, event) {
          const target = event.target;
          if (!(target instanceof HTMLInputElement) || !target.classList.contains("bib-url-input")) return false;

          commitLinkHref(view, target);
          return false;
        },
      },
    },
  }),
);

function commitLinkHref(view: EditorView, input: HTMLInputElement): void {
  const from = Number(input.dataset.bibFrom);
  const to = Number(input.dataset.bibTo);
  const currentHref = input.dataset.bibHref ?? "";
  const nextHref = input.value.trim();
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return;

  if (nextHref === currentHref) return;

  const linkMark = view.state.schema.marks.link;
  if (!linkMark) return;

  const tr = view.state.tr.removeMark(from, to, linkMark);
  if (nextHref) {
    tr.addMark(from, to, linkMark.create({ href: nextHref }));
  }

  view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from, to)).scrollIntoView());
}

export const bibliographyDecorationPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("bibliography-decorations"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        const linkRanges: Array<{ from: number; to: number; href: string }> = [];
        const { selection } = state;

        state.doc.descendants((node, pos) => {
          if (!node.isText) return;
          const linkMark = node.marks.find((mark) => mark.type.name === "link");
          const href = linkMark?.attrs.href;
          if (typeof href !== "string" || href.length === 0) return;

          const from = pos;
          const to = pos + node.nodeSize;
          const previous = linkRanges[linkRanges.length - 1];
          if (previous && previous.href === href && previous.to === from) {
            previous.to = to;
            return;
          }

          linkRanges.push({ from, to, href });
        });

        const urlNumbers = new Map<string, number>();
        for (const range of linkRanges) {
          let number = urlNumbers.get(range.href);
          if (number === undefined) {
            number = urlNumbers.size + 1;
            urlNumbers.set(range.href, number);
          }

          const selectionInsideLink = selection.from <= range.to && selection.to >= range.from;
          decorations.push(
            Decoration.inline(range.from, range.to, {
              class: selectionInsideLink ? "bib-link bib-link-editing" : "bib-link",
              "data-bib-href": range.href,
              title: range.href,
            }),
          );

          if (selectionInsideLink) {
            decorations.push(
              Decoration.widget(
                range.from,
                () => {
                  const span = document.createElement("span");
                  span.className = "bib-source-mark";
                  span.textContent = "[";
                  span.setAttribute("contenteditable", "false");
                  return span;
                },
                { side: -1 },
              ),
            );
            decorations.push(
              Decoration.widget(
                range.to,
                () => {
                  const span = document.createElement("span");
                  span.className = "bib-source-url";
                  span.append("](");

                  const input = document.createElement("input");
                  input.className = "bib-url-input";
                  input.value = range.href;
                  input.dataset.bibFrom = String(range.from);
                  input.dataset.bibTo = String(range.to);
                  input.dataset.bibHref = range.href;
                  input.setAttribute("aria-label", "URL ссылки");
                  span.append(input, ")");
                  span.setAttribute("contenteditable", "false");
                  return span;
                },
                { side: 1 },
              ),
            );
            continue;
          }

          decorations.push(
            Decoration.widget(
              range.to,
              () => {
                const span = document.createElement("span");
                span.className = "bib-ref";
                span.textContent = ` [${number}]`;
                span.dataset.bibHref = range.href;
                span.title = range.href;
                span.setAttribute("contenteditable", "false");
                return span;
              },
              { side: 1 },
            ),
          );
        }

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const imageCaptionAlignmentPlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("image-caption-alignment"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        let imageNumber = 0;
        let pendingCaptionNumber: number | null = null;

        state.doc.forEach((node, offset) => {
          const hasImage = containsImageNode(node);
          const standaloneImage = isStandaloneImageParagraph(node);
          const isCaption =
            pendingCaptionNumber !== null &&
            !hasImage &&
            node.type.name === "paragraph" &&
            node.textContent.trim().length > 0;

          if (isCaption && pendingCaptionNumber !== null) {
            const captionNumber = pendingCaptionNumber;
            decorations.push(
              Decoration.node(offset, offset + node.nodeSize, {
                class: "image-caption",
              }),
            );

            if (!hasCaptionPrefix(node.textContent)) {
              decorations.push(
                Decoration.widget(
                  offset + 1,
                  () => {
                    const span = document.createElement("span");
                    span.className = "image-caption-prefix";
                    span.textContent = getCaptionPrefix(captionNumber);
                    span.setAttribute("contenteditable", "false");
                    return span;
                  },
                  { side: -1 },
                ),
              );
            }
          }

          if (standaloneImage) {
            decorations.push(
              Decoration.node(offset, offset + node.nodeSize, {
                class: "image-paragraph",
              }),
            );
          }

          if (hasImage) {
            imageNumber += 1;
            pendingCaptionNumber = imageNumber;
            return;
          }

          if (isCaption) {
            pendingCaptionNumber = null;
            return;
          }

          if (!isEmptyParagraph(node)) {
            pendingCaptionNumber = null;
          }
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  }),
);

export const resizableImagePlugin = $prose(() =>
  new Plugin({
    key: new PluginKey("resizable-images"),
    props: {
      nodeViews: {
        image: (node, view, getPos) => new ResizableImageView(node, view, getPos),
      },
    },
  }),
);

export const editorEnhancementPlugins = [
  ...codeBlockMetaPlugin,
  trimDoubleClickSelectionPlugin,
  smartQuotesPlugin,
  headingMarkerPlugin,
  headingFormattingPlugin,
  pageBreakDisplayPlugin,
  pageBreakPlugin,
  saveShortcutPlugin,
  changeCasePlugin,
  resizableImagePlugin,
  elementPlaceholderPlugin,
  imageCaptionAlignmentPlugin,
  listingCaptionPlugin,
  tableCaptionPlugin,
  bibliographyPlugin,
  bibliographyDecorationPlugin,
];
