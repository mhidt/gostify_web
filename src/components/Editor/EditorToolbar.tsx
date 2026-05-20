import { ExportButton, type ExportStatus } from "@/components/Editor/ExportButton";

interface EditorToolbarProps {
  onExportDocx: () => void;
  onImagesClick: () => void;
  onAiClick: () => void;
  onChangeCase: () => void;
  onCollectImages: () => void;
  imageCount: number;
  exportStatus: ExportStatus;
}

export function EditorToolbar({
  onExportDocx,
  onImagesClick,
  onAiClick,
  onChangeCase,
  onCollectImages,
  imageCount,
  exportStatus,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2">

      <button
        onClick={onImagesClick}
        className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        Изображения{imageCount > 0 ? ` (${imageCount})` : ""}
      </button>
      <button
        type="button"
        onClick={onAiClick}
        className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        ИИ
      </button>
      <button
        type="button"
        onClick={onChangeCase}
        className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        Регистр
      </button>
      <button
        type="button"
        onClick={onCollectImages}
        className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        Сбор изображений
      </button>
      <ExportButton status={exportStatus} onClick={onExportDocx} />
    </div>
  );
}
