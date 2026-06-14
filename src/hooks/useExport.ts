import { useCallback, useRef, useState } from "react";
import type { ExportStatus } from "@/components/Editor/ExportButton";
import type { DocxPluginSettings } from "@/core/settings";
import { exportDocx } from "@/core/docx/export";
import { normalizeEditorMarkdown } from "@/core/editor/markdown";
import { browserImageProvider } from "@/lib/browserImageProvider";

export function useExport(
  content: string,
  settings: DocxPluginSettings,
  flushSave: (markdown: string) => void,
) {
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const exportStatusRef = useRef(exportStatus);
  exportStatusRef.current = exportStatus;

  const handleExport = useCallback(async () => {
    if (exportStatusRef.current === "exporting") return;

    setExportStatus("exporting");
    setExportMessage(null);

    try {
      const markdown = normalizeEditorMarkdown(content);
      flushSave(markdown);
      await exportDocx(markdown, settings, browserImageProvider);
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
  }, [content, settings, flushSave]);

  return { exportStatus, exportMessage, handleExport };
}
