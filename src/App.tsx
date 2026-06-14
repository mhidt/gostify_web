import { useCallback, useEffect, useRef, useState } from "react";
import { MilkdownEditor } from "@/components/Editor/MilkdownEditor";
import { AiPanel } from "@/components/Ai/AiPanel";
import AiContextMenu from "@/components/Ai/AiContextMenu";
import { Header } from "@/components/Layout/Header";
import { StatusBar } from "@/components/Layout/StatusBar";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { ImageManager } from "@/components/Editor/ImageManager";
import { EditorProvider, useEditorAdapter } from "@/contexts/EditorContext";
import { useSettings } from "@/hooks/useSettings";
import { useDocument } from "@/hooks/useDocument";
import { useImages } from "@/hooks/useImages";
import { useAiGeneration } from "@/hooks/useAiGeneration";
import { useTheme } from "@/hooks/useTheme";
import { useExport } from "@/hooks/useExport";
import { normalizeEditorMarkdown } from "@/core/editor/markdown";
import { downloadBlob } from "@/lib/downloadBlob";

function AppContent() {
  const { settings, setSettings, resetSettings } = useSettings();
  const { content, setContent, replaceContent, flushSave, saveState } = useDocument();
  const { images, imageUrls, ready, addImage, removeImage, getImageBlobUrl } = useImages();
  const aiGeneration = useAiGeneration(settings);
  const { theme, toggleTheme } = useTheme();
  const { exportStatus, exportMessage, handleExport } = useExport(content, settings, flushSave);
  const { editorAdapter } = useEditorAdapter();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [aiContextMenu, setAiContextMenu] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadImage = useCallback(
    async (file: File) => {
      const name = await addImage(file);
      const blobUrl = getImageBlobUrl(name);
      if (!blobUrl) throw new Error(`Не удалось создать превью для ${name}`);

      return { name, blobUrl };
    },
    [addImage, getImageBlobUrl],
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
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onExportDocx={handleExport}
        onImagesClick={() => setImagesOpen((open) => !open)}
        onAiClick={() => setAiOpen((open) => !open)}
        imageCount={images.length}
        exportStatus={exportStatus}
      />

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {ready ? (
          <MilkdownEditor
            key={documentVersion}
            content={content}
            onChange={setContent}
            settings={settings}
            imageUrls={imageUrls}
            onUploadImage={handleUploadImage}
            onAiContextMenu={handleAiContextMenu}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Загрузка редактора...</div>
        )}
      </main>

      <StatusBar exportStatus={exportStatus} exportMessage={exportMessage} imageCount={images.length} content={content} />

      {aiContextMenu && (
        <AiContextMenu
          position={aiContextMenu}
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
      />

      <AiPanel
        open={aiOpen}
        settings={settings}
        state={aiGeneration.state}
        isRunning={aiGeneration.isRunning}
        onClose={() => setAiOpen(false)}
        onGenerate={aiGeneration.generate}
        onStop={aiGeneration.stop}
        onSetActiveProvider={(index) => setSettings({ aiActiveProvider: index })}
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

export default function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  );
}
