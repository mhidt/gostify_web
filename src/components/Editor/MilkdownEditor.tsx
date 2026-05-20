import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { defaultValueCtx, Editor, editorViewCtx, parserCtx, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { upload, uploadConfig } from "@milkdown/kit/plugin/upload";
import { TextSelection } from "@milkdown/kit/prose/state";
import { getMarkdown } from "@milkdown/kit/utils";
import { nord } from "@milkdown/theme-nord";
import type { EditorAdapter } from "@/core/ai/generator";
import { normalizeEditorMarkdown } from "@/core/editor/markdown";
import { switchCase } from "@/core/editor/utils";
import type { DocxPluginSettings } from "@/core/settings";
import { editorEnhancementPlugins, setEditorImageCaptionSettings } from "@/lib/editorEnhancements";
import "@milkdown/theme-nord/style.css";

interface MilkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  settings: Pick<DocxPluginSettings, "firstLineIndent" | "imageShortCaption" | "imageCaptionSeparator">;
  imageUrls?: Map<string, string>;
  onUploadImage?: (file: File) => Promise<{ name: string; blobUrl: string }>;
  registerImageInserter?: (insertImage: ((name: string) => void) | null) => void;
  registerEditorAdapter?: (adapter: EditorAdapter | null) => void;
  onAiContextMenu?: (position: { x: number; y: number }) => void;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toEditorMarkdown(markdown: string, imageUrls: Map<string, string>) {
  return markdown.replace(/!\[\[([^\]]+)\]\]/g, (match, inner: string) => {
    const name = inner.split("|")[0] ?? inner;
    const blobUrl = imageUrls.get(name);
    if (!blobUrl) return match;

    return `![${inner}](${blobUrl})`;
  });
}

function fromEditorMarkdown(markdown: string, imageUrls: Map<string, string>) {
  let nextMarkdown = normalizeEditorMarkdown(markdown);

  for (const [name, blobUrl] of imageUrls.entries()) {
    const escapedBlobUrl = escapeRegExp(blobUrl);
    nextMarkdown = nextMarkdown.replace(new RegExp(`!\\[([^\\]]*)\\]\\(${escapedBlobUrl}\\)`, "g"), (_match, alt) => {
      return `![[${alt || name}]]`;
    });
  }

  return nextMarkdown;
}

function MilkdownEditorInner({
  content,
  onChange,
  settings,
  imageUrls = new Map(),
  onUploadImage,
  registerImageInserter,
  registerEditorAdapter,
  onAiContextMenu,
}: MilkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  const imageUrlsRef = useRef(imageUrls);
  const onUploadImageRef = useRef(onUploadImage);
  onChangeRef.current = onChange;
  imageUrlsRef.current = imageUrls;
  onUploadImageRef.current = onUploadImage;
  setEditorImageCaptionSettings(settings);

  const editorMarkdown = useMemo(() => toEditorMarkdown(content, imageUrls), []);

  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, editorMarkdown);
        ctx.update(uploadConfig.key, (prev) => ({
          ...prev,
          enableHtmlFileUploader: true,
          uploader: async (files, schema, _ctx, _insertPos) => {
            const nodes = [];
            const imageNode = schema.nodes.image;

            for (const file of Array.from(files)) {
              if (!file.type.startsWith("image/") || !onUploadImageRef.current) continue;

              const { name, blobUrl } = await onUploadImageRef.current(file);
              if (imageNode) {
                nodes.push(imageNode.create({ src: blobUrl, alt: name, title: null }));
              } else {
                nodes.push(schema.text(`![[${name}]]`));
              }
            }

            return nodes;
          },
        }));
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            onChangeRef.current(fromEditorMarkdown(markdown, imageUrlsRef.current));
          }
        });
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(clipboard)
      .use(upload)
      .use(editorEnhancementPlugins)
      .use(listener)
    ,
    [],
  );

  const getEditorRef = useRef(get);
  getEditorRef.current = get;

  useEffect(() => {
    setEditorImageCaptionSettings(settings);
    getEditorRef.current()?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr.setMeta("editor-image-caption-settings", Date.now()));
    });
  }, [settings.imageShortCaption, settings.imageCaptionSeparator]);

  useEffect(() => {
    if (!registerImageInserter) return;

    registerImageInserter((name) => {
      const editor = getEditorRef.current();
      const blobUrl = imageUrlsRef.current.get(name);

      editor?.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const imageNode = view.state.schema.nodes.image;
        const { selection, tr } = view.state;
        const transaction =
          blobUrl && imageNode
            ? tr.replaceSelectionWith(imageNode.create({ src: blobUrl, alt: name, title: null })).scrollIntoView()
            : tr.insertText(`![[${name}]]`, selection.from, selection.to).scrollIntoView();

        view.dispatch(transaction);
        view.focus();
      });
    });

    return () => {
      registerImageInserter(null);
    };
  }, [registerImageInserter]);

  useEffect(() => {
    if (!registerEditorAdapter) return;

    const adapter: EditorAdapter = {
      getSelection() {
        const editor = getEditorRef.current();
        if (!editor) return "";

        return editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { from, to } = view.state.selection;
          if (from === to) return "";

          return fromEditorMarkdown(getMarkdown({ from, to })(ctx), imageUrlsRef.current);
        });
      },

      getSelectionRange() {
        const editor = getEditorRef.current();
        if (!editor) return { from: 0, to: 0 };

        return editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { from, to } = view.state.selection;
          return { from, to };
        });
      },

      getValue() {
        const editor = getEditorRef.current();
        if (!editor) return "";

        return editor.action((ctx) => fromEditorMarkdown(getMarkdown()(ctx), imageUrlsRef.current));
      },

      replaceRange(from, to, text) {
        const editor = getEditorRef.current();
        if (!editor) return from;

        return editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const tr = view.state.tr;

          if (!text) {
            view.dispatch(tr.delete(from, to).scrollIntoView());
            return from;
          }

          const parser = ctx.get(parserCtx);
          const parsed = parser(toEditorMarkdown(text, imageUrlsRef.current));
          const fragment = parsed.content;
          view.dispatch(tr.replaceWith(from, to, fragment).scrollIntoView());
          return from + fragment.size;
        });
      },

      replaceReasoning(from, to, text) {
        const editor = getEditorRef.current();
        if (!editor) return from;

        return editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { schema, tr } = view.state;
          const blockquote = schema.nodes.blockquote;
          const paragraph = schema.nodes.paragraph;
          const textNode = schema.text(text);
          const content = blockquote && paragraph ? blockquote.create(null, paragraph.create(null, textNode)) : textNode;

          view.dispatch(tr.replaceWith(from, to, content).scrollIntoView());
          return from + content.nodeSize;
        });
      },

      changeSelectionCase() {
        const editor = getEditorRef.current();
        editor?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { from, to } = view.state.selection;
          if (from === to) return;

          const selected = view.state.doc.textBetween(from, to, "\n", "\n");
          const next = switchCase(selected);
          const tr = view.state.tr.insertText(next, from, to).scrollIntoView();
          view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from, from + next.length)));
          view.focus();
        });
      },

      insertImageDescriptions() {
        const editor = getEditorRef.current();
        editor?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const markdown = fromEditorMarkdown(getMarkdown()(ctx), imageUrlsRef.current);
          const descriptions = [...markdown.matchAll(/<ИЗОБРАЖЕНИЕ:\s*([^>]+)>/g)]
            .map((match, index) => `${index + 1}. ${match[1]?.trim()}`)
            .filter((line) => !line.endsWith(". undefined"));

          if (descriptions.length === 0) return;

          const { from, to } = view.state.selection;
          view.dispatch(view.state.tr.insertText(descriptions.join("\n"), from, to).scrollIntoView());
          view.focus();
        });
      },

      setCursor(pos) {
        const editor = getEditorRef.current();
        editor?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const safePos = Math.max(0, Math.min(pos, view.state.doc.content.size));
          view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(safePos))));
          view.focus();
        });
      },

      focus() {
        getEditorRef.current()?.action((ctx) => {
          ctx.get(editorViewCtx).focus();
        });
      },
    };

    registerEditorAdapter(adapter);

    return () => {
      registerEditorAdapter(null);
    };
  }, [registerEditorAdapter]);

  return (
    <div
      className="milkdown-editor flex-1 overflow-auto"
      style={{ "--editor-first-line-indent": `${settings.firstLineIndent}cm` } as CSSProperties}
      onContextMenu={(event) => {
        if (!onAiContextMenu) return;
        event.preventDefault();
        onAiContextMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      <Milkdown />
    </div>
  );
}

export function MilkdownEditor(props: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner {...props} />
    </MilkdownProvider>
  );
}
