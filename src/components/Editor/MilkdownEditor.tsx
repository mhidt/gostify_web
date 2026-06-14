import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { defaultValueCtx, Editor, editorViewCtx, parserCtx, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { upload, uploadConfig } from "@milkdown/kit/plugin/upload";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { getMarkdown } from "@milkdown/kit/utils";
import { nord } from "@milkdown/theme-nord";
import type { EditorAdapter } from "@/core/ai/generator";
import { normalizeEditorMarkdown } from "@/core/editor/markdown";
import { switchCase } from "@/core/editor/utils";
import type { DocxPluginSettings } from "@/core/settings";
import { SearchPanel, type SearchPanelMode } from "@/components/Editor/SearchPanel";
import { useEditorRegistration, type SearchPanelMode as ContextSearchPanelMode } from "@/contexts/EditorContext";
import { editorEnhancementPlugins, setEditorDisplaySettings } from "@/lib/editorEnhancements";
import { clearSearch, searchPlugin, setSearchQuery } from "@/lib/plugins/searchPlugin";
import "@milkdown/theme-nord/style.css";

interface MilkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  settings: Pick<
    DocxPluginSettings,
    | "chapterAlignment"
    | "chapterAllCaps"
    | "chapterBold"
    | "chapterDot"
    | "chapterFontSize"
    | "chapterIndent"
    | "chapterPrefix"
    | "captionSeparator"
    | "firstLineIndent"
    | "imageShortCaption"
    | "lineSpacing"
    | "paragraphAlignment"
    | "paragraphBold"
    | "paragraphDot"
    | "paragraphFontSize"
    | "paragraphIndent"
  >;
  imageUrls?: Map<string, string>;
  onUploadImage?: (file: File) => Promise<{ name: string; blobUrl: string }>;
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

function toTextAlign(value: string): "center" | "justify" | "left" {
  if (value === "center") return "center";
  if (value === "justified") return "justify";
  return "left";
}

function getSelectedPlainText(view: EditorView) {
  const { from, to, empty } = view.state.selection;
  if (empty) return "";

  return view.state.doc.textBetween(from, to, "\n", "\n");
}

function MilkdownEditorInner({
  content,
  onChange,
  settings,
  imageUrls = new Map(),
  onUploadImage,
  onAiContextMenu,
}: MilkdownEditorProps) {
  const { registerImageInserter, registerEditorAdapter, registerSearchOpener } = useEditorRegistration();
  const onChangeRef = useRef(onChange);
  const imageUrlsRef = useRef(imageUrls);
  const onUploadImageRef = useRef(onUploadImage);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [searchPanelMode, setSearchPanelMode] = useState<SearchPanelMode | null>(null);
  const [searchPanelTop, setSearchPanelTop] = useState(8);
  const [searchPanelKey, setSearchPanelKey] = useState(0);
  onChangeRef.current = onChange;
  imageUrlsRef.current = imageUrls;
  onUploadImageRef.current = onUploadImage;
  setEditorDisplaySettings(settings);

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
      .use(searchPlugin)
      .use(listener)
    ,
    [],
  );

  const getEditorRef = useRef(get);
  getEditorRef.current = get;

  useEffect(() => {
    let disposed = false;
    let interval: number | undefined;

    const syncEditorView = () => {
      let foundView = false;
      getEditorRef.current()?.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        foundView = true;
        if (!disposed) {
          setEditorView((previous) => (previous === view ? previous : view));
          if (interval) {
            window.clearInterval(interval);
          }
        }
      });

      return foundView;
    };

    if (!syncEditorView()) {
      interval = window.setInterval(syncEditorView, 100);
    }

    return () => {
      disposed = true;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, []);

  useEffect(() => {
    if (!searchPanelMode) return;

    const updatePanelTop = () => {
      const top = editorContainerRef.current?.getBoundingClientRect().top ?? 0;
      setSearchPanelTop(Math.max(8, top + 8));
    };

    updatePanelTop();
    window.addEventListener("resize", updatePanelTop);

    return () => {
      window.removeEventListener("resize", updatePanelTop);
    };
  }, [searchPanelMode]);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (!editorView) return;

      // Use event.code instead of event.key to work with any keyboard layout.
      // event.key returns layout-specific characters (e.g. "а" on Russian layout
      // for the physical F key), while event.code returns the physical key ("KeyF").
      const isFind = (event.ctrlKey || event.metaKey) && event.code === "KeyF";
      const isReplace = (event.ctrlKey || event.metaKey) && (event.code === "KeyR" || event.code === "KeyH");

      if (isFind || isReplace) {
        // Allow Ctrl+F/H when focus is inside the editor area, or when the
        // search panel is already open. In other contexts (e.g. a text input
        // elsewhere in the UI) we let the event propagate so the browser or
        // that component can handle it.
        const activeElement = document.activeElement;
        const isEditorActive = activeElement ? editorContainerRef.current?.contains(activeElement) : false;
        if (!isEditorActive && !searchPanelMode) return;

        event.preventDefault();
        event.stopPropagation();

        const selectedText = getSelectedPlainText(editorView);
        if (selectedText) {
          setSearchQuery(editorView, selectedText);
        }
        setSearchPanelMode(isReplace ? "replace" : "search");
        setSearchPanelKey((k) => k + 1);
        return;
      }

      if (event.key === "Escape" && searchPanelMode) {
        event.preventDefault();
        clearSearch(editorView);
        setSearchPanelMode(null);
      }
    };

    document.addEventListener("keydown", handleSearchShortcut, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleSearchShortcut, { capture: true });
    };
  }, [editorView, searchPanelMode]);

  useEffect(() => {
    setEditorDisplaySettings(settings);
    getEditorRef.current()?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr.setMeta("editor-display-settings", Date.now()));
    });
  }, [
    settings.chapterDot,
    settings.chapterPrefix,
    settings.imageShortCaption,
    settings.captionSeparator,
    settings.paragraphDot,
  ]);

  useEffect(() => {
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
    registerSearchOpener((mode: ContextSearchPanelMode) => {
      if (editorView) {
        const selectedText = getSelectedPlainText(editorView);
        if (selectedText) {
          setSearchQuery(editorView, selectedText);
        }
      }
      setSearchPanelMode(mode);
      setSearchPanelKey((k) => k + 1);
    });

    return () => {
      registerSearchOpener(null);
    };
  }, [registerSearchOpener, editorView]);

  useEffect(() => {
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
      ref={editorContainerRef}
      className="milkdown-editor relative flex-1 overflow-auto"
      style={
        {
          "--editor-chapter-align": toTextAlign(settings.chapterAlignment),
          "--editor-chapter-font-size": `${settings.chapterFontSize}pt`,
          "--editor-chapter-font-weight": settings.chapterBold ? "700" : "400",
          "--editor-chapter-indent": settings.chapterIndent ? `${settings.firstLineIndent}cm` : "0",
          "--editor-chapter-text-transform": settings.chapterAllCaps ? "uppercase" : "none",
          "--editor-first-line-indent": `${settings.firstLineIndent}cm`,
          "--editor-line-spacing": settings.lineSpacing,
          "--editor-paragraph-align": toTextAlign(settings.paragraphAlignment),
          "--editor-paragraph-font-size": `${settings.paragraphFontSize}pt`,
          "--editor-paragraph-font-weight": settings.paragraphBold ? "700" : "400",
          "--editor-paragraph-indent": settings.paragraphIndent ? `${settings.firstLineIndent}cm` : "0",
        } as CSSProperties
      }
      onContextMenu={(event) => {
        if (!onAiContextMenu) return;
        event.preventDefault();
        onAiContextMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      {searchPanelMode && editorView ? (
        <SearchPanel
          mode={searchPanelMode}
          view={editorView}
          top={searchPanelTop}
          activationKey={searchPanelKey}
          onModeChange={setSearchPanelMode}
          onClose={() => setSearchPanelMode(null)}
        />
      ) : null}
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
