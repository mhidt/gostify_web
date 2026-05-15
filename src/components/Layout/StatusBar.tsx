import type { ExportStatus } from "@/components/Editor/ExportButton";

interface StatusBarProps {
  exportStatus: ExportStatus;
  exportMessage: string | null;
  imageCount: number;
}

const exportLabels: Record<ExportStatus, string> = {
  idle: "DOCX готов к экспорту",
  exporting: "Экспорт DOCX...",
  success: "DOCX экспортирован",
  error: "Ошибка экспорта DOCX",
};

export function StatusBar({ exportStatus, exportMessage, imageCount }: StatusBarProps) {
  return (
    <footer className="flex h-6 items-center justify-between border-t border-gray-200 bg-white px-3 text-[11px] text-gray-500">
      <span>GOSTify v0.1</span>
      <span className={exportStatus === "error" ? "text-red-600" : ""}>{exportMessage ?? exportLabels[exportStatus]}</span>
      <span>Изображений: {imageCount}</span>
    </footer>
  );
}

export default StatusBar;
