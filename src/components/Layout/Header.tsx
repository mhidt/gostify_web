import type { RefObject } from "react";

interface HeaderProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  saveState: "saved" | "pending" | "saving";
  theme: "light" | "dark";
  onOpenMarkdown: (file: File) => void;
  onSaveMarkdown: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

const saveLabels: Record<HeaderProps["saveState"], string> = {
  saved: "Сохранено",
  pending: "Изменено",
  saving: "Сохранение...",
};

export function Header({
  fileInputRef,
  saveState,
  theme,
  onOpenMarkdown,
  onSaveMarkdown,
  onToggleTheme,
  onOpenSettings,
}: HeaderProps) {

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-900">Gostify</h1>
        <span className="text-xs text-gray-400">веб-версия</span>
        <span className="text-xs text-gray-400">{saveLabels[saveState]}</span>
      </div>

      <div className="flex items-center gap-2">
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
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Открыть
        </button>
        <button
          onClick={onSaveMarkdown}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Сохранить .md
        </button>
        <button
          onClick={onToggleTheme}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          {theme === "dark" ? "Светлая" : "Темная"}
        </button>
        <button
          onClick={onOpenSettings}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Настройки
        </button>
      </div>
    </header>
  );
}

export default Header;
