export type ExportStatus = "idle" | "exporting" | "success" | "error";

interface ExportButtonProps {
  status: ExportStatus;
  onClick: () => void;
}

const labels: Record<ExportStatus, string> = {
  idle: "Экспорт .doc",
  exporting: "Экспорт...",
  success: "Готово!",
  error: "Ошибка",
};

export function ExportButton({ status, onClick }: ExportButtonProps) {
  const isExporting = status === "exporting";
  const className =
    status === "error"
      ? "bg-red-600 text-white hover:bg-red-700"
      : status === "success"
        ? "bg-emerald-600 text-white hover:bg-emerald-700"
        : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isExporting}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-80 ${className}`}
    >
      {labels[status]}
    </button>
  );
}
