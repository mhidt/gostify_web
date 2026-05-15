import { useCallback, useEffect, useRef, useState } from "react";
import { MilkdownEditor } from "@/components/Editor/MilkdownEditor";
import { EditorToolbar } from "@/components/Editor/EditorToolbar";
import { ImageManager } from "@/components/Editor/ImageManager";
import { AiPanel } from "@/components/Ai/AiPanel";
import AiContextMenu from "@/components/Ai/AiContextMenu";
import type { ExportStatus } from "@/components/Editor/ExportButton";
import { Header } from "@/components/Layout/Header";
import { StatusBar } from "@/components/Layout/StatusBar";
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
  const [aiContextMenu, setAiContextMenu] = useState<{ x: number; y: number } | null>(null);
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

  const handleAiContextMenu = useCallback((position: { x: number; y: number }) => {
    setAiContextMenu(position);
  }, []);

  const runContextGeneration = useCallback(
    (mode: "full" | "partial") => {
      setAiOpen(true);
      void aiGeneration.generate(mode, editorAdapter);
    },
    [aiGeneration, editorAdapter],
  );

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
      <Header
        fileInputRef={fileInputRef}
        saveState={saveState}
        theme={theme}
        onOpenMarkdown={(file) => void openMarkdownFile(file)}
        onSaveMarkdown={handleSaveMarkdown}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onOpenSettings={() => setSettingsOpen(true)}
      />

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
            onAiContextMenu={handleAiContextMenu}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Загрузка редактора...</div>
        )}
      </main>

      <StatusBar exportStatus={exportStatus} exportMessage={exportMessage} imageCount={images.length} />

      {aiContextMenu && (
        <AiContextMenu
          position={aiContextMenu}
          canGenerate={Boolean(editorAdapter)}
          isRunning={aiGeneration.isRunning}
          onClose={() => setAiContextMenu(null)}
          onGenerateWork={() => runContextGeneration("full")}
          onGenerateFragment={() => runContextGeneration("partial")}
        />
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
