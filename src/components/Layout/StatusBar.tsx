import { useMemo } from "react";
import type { ExportStatus } from "@/components/Editor/ExportButton";

interface StatusBarProps {
  exportStatus: ExportStatus;
  exportMessage: string | null;
  imageCount: number;
  content: string;
}

const exportLabels: Record<ExportStatus, string> = {
  idle: "DOCX готов к экспорту",
  exporting: "Экспорт DOCX...",
  success: "DOCX экспортирован",
  error: "Ошибка экспорта DOCX",
};

function countWords(text: string): number {
  const stripped = text.replace(/[#*_`\[\]()<!>~|]/g, "").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

export function StatusBar({ exportStatus, exportMessage, imageCount, content }: StatusBarProps) {
  const wordCount = useMemo(() => countWords(content), [content]);
  const charCount = content.length;

  return (
    <footer className="relative flex h-6 items-center border-t border-gray-200 bg-white px-3 text-[11px] text-gray-500">
      <div className="flex items-center gap-3">
        <span>Слов: {wordCount}</span>
        <span>Символов: {charCount}</span>
        <span>Изображений: {imageCount}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={exportStatus === "error" ? "text-red-600" : ""}>
          {exportMessage ?? exportLabels[exportStatus]}
        </span>
      </div>
      <span className="ml-auto">GOSTify v0.1</span>
    </footer>
  );
}

export default StatusBar;
