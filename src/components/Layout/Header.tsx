import { type RefObject, useState, useRef, useEffect } from "react";
import {
  FileText,
  ChevronDown,
  FolderOpen,
  Save,
  Search,
  Image,
  WandSparkles,
  AArrowDown,
  Images,
  CircleHelp,
  FileDown,
  Moon,
  Sun,
  Settings,
} from "lucide-react";
import type { ExportStatus } from "@/components/Editor/ExportButton";
import { useEditorAdapter } from "@/contexts/EditorContext";

interface HeaderProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  saveState: "saved" | "pending" | "saving";
  theme: "light" | "dark";
  onOpenMarkdown: (file: File) => void;
  onSaveMarkdown: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onExportDocx: () => void;
  onImagesClick: () => void;
  onAiClick: () => void;
  imageCount: number;
  exportStatus: ExportStatus;
}

const saveLabels: Record<HeaderProps["saveState"], string> = {
  saved: "Сохранено",
  pending: "Изменено",
  saving: "Сохранение...",
};

const exportLabels: Record<ExportStatus, string> = {
  idle: "Экспортировать в .doc",
  exporting: "Экспорт...",
  success: "Готово!",
  error: "Ошибка",
};

function FaviconIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-brand-600"
    >
      <path d="M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z" />
    </svg>
  );
}

export function Header({
  fileInputRef,
  saveState,
  theme,
  onOpenMarkdown,
  onSaveMarkdown,
  onToggleTheme,
  onOpenSettings,
  onExportDocx,
  onImagesClick,
  onAiClick,
  imageCount,
  exportStatus,
}: HeaderProps) {
  const { editorAdapter, searchOpener } = useEditorAdapter();
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    if (fileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fileMenuOpen]);

  const showTooltip = () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setTooltipVisible(true);
  };
  const hideTooltip = () => {
    tooltipTimeoutRef.current = setTimeout(() => setTooltipVisible(false), 100);
  };

  const exportClassName =
    exportStatus === "error"
      ? "bg-red-600 text-white hover:bg-red-700"
      : exportStatus === "success"
        ? "bg-emerald-600 text-white hover:bg-emerald-700"
        : "bg-brand-600 text-white hover:bg-brand-700";

  return (
    <header className="flex items-center h-14 border-b border-gray-200 bg-white px-5">
      <div className="flex items-center gap-2 shrink-0">
        <FaviconIcon />
        <h1 className="text-lg font-semibold text-gray-900">Gostify</h1>
        <span className="flex items-center gap-1.5 text-xs text-gray-400 ml-2">
          <span className={`w-2 h-2 rounded-full ${saveState === "saved" ? "bg-emerald-400" : saveState === "saving" ? "bg-amber-400" : "bg-amber-500"}`} />
          {saveLabels[saveState]}
        </span>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-4" />

      <div className="relative" ref={fileMenuRef}>
        <button
          onClick={() => setFileMenuOpen((v) => !v)}
          className="h-8 px-3 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
        >
          <FileText className="w-4 h-4" />
          Файл
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {fileMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={() => { setFileMenuOpen(false); fileInputRef.current?.click(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium">Открыть</div>
                <div className="text-[11px] text-gray-400">Файлы .md, .txt</div>
              </div>
              <span className="ml-auto text-[11px] text-gray-400 font-mono">Ctrl+O</span>
            </button>
            <button
              onClick={() => { setFileMenuOpen(false); onSaveMarkdown(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <Save className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium">Сохранить .md</div>
                <div className="text-[11px] text-gray-400">Скачать Markdown</div>
              </div>
              <span className="ml-auto text-[11px] text-gray-400 font-mono">Ctrl+S</span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onOpenMarkdown(file);
          event.target.value = "";
        }}
      />

      <div className="w-px h-6 bg-gray-200 mx-4" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => searchOpener?.("search")}
          className="h-8 px-3 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
          title="Найти и заменить (Ctrl+F)"
        >
          <Search className="w-4 h-4" />
          Поиск
        </button>

        <button
          onClick={onImagesClick}
          className="h-8 px-3 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
        >
          <Image className="w-4 h-4" />
          Изображения
          {imageCount > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1.5 text-[11px] font-medium text-gray-600">
              {imageCount}
            </span>
          )}
        </button>

        <button
          onClick={onAiClick}
          className="h-8 px-3 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
        >
          <WandSparkles className="w-4 h-4" />
          ИИ
        </button>

        <button
          onClick={() => editorAdapter?.changeSelectionCase()}
          className="h-8 px-3 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
        >
          <AArrowDown className="w-5 h-5" />
          Регистр
        </button>

        <button
          onClick={() => editorAdapter?.insertImageDescriptions()}
          className="h-8 px-3 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
        >
          <Images className="w-4 h-4" />
          Сбор изображений
          <span
            className="relative inline-flex items-center justify-center ml-0.5"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <CircleHelp className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
            {tooltipVisible && (
              <div
                className="absolute top-full mt-2 w-80 bg-white text-gray-700 rounded-lg p-3 text-xs leading-relaxed z-50 shadow-lg border border-gray-200"
                style={{ left: "50%", transform: "translateX(-50%)" }}
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-l border-t border-gray-200" />
                <p className="font-semibold mb-1 text-gray-900">Зачем нужен сбор изображений?</p>
                <p className="text-gray-500">При генерации ИИ оставляет заглушки вместо изображений. Эта функция собирает все «выдуманные» изображения, чтобы вы могли сделать нужные скриншоты или подобрать подходящие фото.</p>
              </div>
            )}
          </span>
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          onClick={onExportDocx}
          disabled={exportStatus === "exporting"}
          className={`h-8 px-4 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:cursor-wait disabled:opacity-80 ${exportClassName}`}
        >
          <FileDown className="w-4 h-4" />
          {exportLabels[exportStatus]}
        </button>

        <div className="w-px h-6 bg-gray-200" />

        <button
          onClick={onToggleTheme}
          className="h-8 w-8 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title={theme === "dark" ? "Светлая тема" : "Темная тема"}
          aria-label={theme === "dark" ? "Включить светлую тему" : "Включить темную тему"}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button
          onClick={onOpenSettings}
          className="h-8 w-8 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Настройки"
          aria-label="Открыть настройки"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

export default Header;
