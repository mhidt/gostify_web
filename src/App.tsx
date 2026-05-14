import { useCallback, useEffect, useRef, useState } from "react";
import { MilkdownEditor } from "@/components/Editor/MilkdownEditor";
import { EditorToolbar } from "@/components/Editor/EditorToolbar";
import { ImageManager } from "@/components/Editor/ImageManager";
import { AiPanel } from "@/components/Ai/AiPanel";
import type { ExportStatus } from "@/components/Editor/ExportButton";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { useSettings } from "@/hooks/useSettings";
import { useDocument } from "@/hooks/useDocument";
import { useImages } from "@/hooks/useImages";
import { useAiGeneration } from "@/hooks/useAiGeneration";
import { exportDocx } from "@/core/docx/export";
import type { EditorAdapter } from "@/core/ai/generator";
import { normalizeEditorMarkdown } from "@/core/editor/markdown";
import { browserImageProvider } from "@/lib/browserImageProvider";
import { downloadBlob } from "@/lib/downloadBlob";

export default function App() {
  const { settings, setSettings, resetSettings } = useSettings();
  const { content, setContent, replaceContent, flushSave, saveState } = useDocument();
  const { images, imageUrls, ready, addImage, removeImage, getImageBlobUrl } = useImages();
  const aiGeneration = useAiGeneration(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [insertImage, setInsertImage] = useState<((name: string) => void) | null>(null);
  const [editorAdapter, setEditorAdapter] = useState<EditorAdapter | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("gostify-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("gostify-theme", theme);
  }, [theme]);

  const handleExport = async () => {
    if (exportStatus === "exporting") return;

    setExportStatus("exporting");
    setExportMessage(null);

    try {
      flushSave(normalizeEditorMarkdown(content));
      await exportDocx(normalizeEditorMarkdown(content), settings, browserImageProvider);
      setExportStatus("success");
      setExportMessage("Документ скачан.");
      window.setTimeout(() => {
        setExportStatus("idle");
        setExportMessage(null);
      }, 2500);
    } catch (e) {
      console.error("Export error:", e);
      setExportStatus("error");
      setExportMessage(e instanceof Error ? e.message : "Не удалось экспортировать документ.");
      window.setTimeout(() => {
        setExportStatus("idle");
      }, 3500);
    }
  };

  const handleUploadImage = useCallback(
    async (file: File) => {
      const name = await addImage(file);
      const blobUrl = getImageBlobUrl(name);
      if (!blobUrl) throw new Error(`Не удалось создать превью для ${name}`);

      return { name, blobUrl };
    },
    [addImage, getImageBlobUrl],
  );

  const registerImageInserter = useCallback((inserter: ((name: string) => void) | null) => {
    setInsertImage(() => inserter);
  }, []);

  const registerEditorAdapter = useCallback((adapter: EditorAdapter | null) => {
    setEditorAdapter(adapter);
  }, []);

  const handleInsertImage = useCallback(
    (name: string) => {
      insertImage?.(name);
    },
    [insertImage],
  );

  const openMarkdownFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      replaceContent(normalizeEditorMarkdown(text));
      setDocumentVersion((version) => version + 1);
    },
    [replaceContent],
  );

  const handleSaveMarkdown = useCallback(() => {
    const markdown = normalizeEditorMarkdown(content);
    flushSave(markdown);
    downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), "document.md");
  }, [content, flushSave]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyS") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        flushSave(normalizeEditorMarkdown(content));
      }
    };

    const handleEditorSave = () => flushSave(normalizeEditorMarkdown(content));

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    document.documentElement.addEventListener("keydown", handleKeyDown, { capture: true });
    document.body?.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("gostify-save", handleEditorSave);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.documentElement.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.body?.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("gostify-save", handleEditorSave);
    };
  }, [content, flushSave]);

  return (
    <div
      className="relative flex h-screen flex-col bg-gray-50"
      onDragOver={(event) => {
        if (Array.from(event.dataTransfer.items).some((item) => item.kind === "file")) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        const file = event.dataTransfer.files[0];
        if (!file || !/\.(md|txt)$/i.test(file.name)) return;
        event.preventDefault();
        void openMarkdownFile(file);
      }}
    >
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">Gostify</h1>
          <span className="text-xs text-gray-400">веб-версия</span>
          <span className="text-xs text-gray-400">
            {saveState === "saving" ? "Сохранение..." : saveState === "pending" ? "Изменено" : "Сохранено"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void openMarkdownFile(file);
              event.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Открыть
          </button>
          <button
            onClick={handleSaveMarkdown}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Сохранить .md
          </button>
          <button
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {theme === "dark" ? "Светлая" : "Темная"}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Настройки
          </button>
        </div>
      </header>

      <EditorToolbar
        onExportDocx={handleExport}
        onImagesClick={() => setImagesOpen((open) => !open)}
        onAiClick={() => setAiOpen((open) => !open)}
        onChangeCase={() => editorAdapter?.changeSelectionCase()}
        onCollectImages={() => editorAdapter?.insertImageDescriptions()}
        imageCount={images.length}
        exportStatus={exportStatus}
      />

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {ready ? (
          <MilkdownEditor
            key={documentVersion}
            content={content}
            onChange={setContent}
            imageUrls={imageUrls}
            onUploadImage={handleUploadImage}
            registerImageInserter={registerImageInserter}
            registerEditorAdapter={registerEditorAdapter}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Загрузка редактора...</div>
        )}
      </main>

      {exportMessage && (
        <div
          className={`absolute bottom-4 right-4 z-30 rounded-md px-4 py-2 text-sm font-medium shadow-lg ${
            exportStatus === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"
          }`}
        >
          {exportMessage}
        </div>
      )}

      <ImageManager
        images={images}
        open={imagesOpen}
        onClose={() => setImagesOpen(false)}
        onAddImage={addImage}
        onRemoveImage={removeImage}
        onInsertImage={handleInsertImage}
      />

      <AiPanel
        open={aiOpen}
        settings={settings}
        state={aiGeneration.state}
        isRunning={aiGeneration.isRunning}
        editorAdapter={editorAdapter}
        onClose={() => setAiOpen(false)}
        onGenerate={aiGeneration.generate}
        onStop={aiGeneration.stop}
      />

      <SettingsPanel
        settings={settings}
        setSettings={setSettings}
        resetSettings={resetSettings}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
