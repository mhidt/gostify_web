import { useEffect, useRef, useState } from "react";
import type { AiGenerationState, useAiGeneration } from "@/hooks/useAiGeneration";
import type { DocxPluginSettings } from "@/core/settings";
import type { EditorAdapter, GenerateMode } from "@/core/ai/generator";

interface AiPanelProps {
  open: boolean;
  settings: DocxPluginSettings;
  state: AiGenerationState;
  isRunning: boolean;
  editorAdapter: EditorAdapter | null;
  onClose: () => void;
  onGenerate: ReturnType<typeof useAiGeneration>["generate"];
  onStop: () => void;
  onSetActiveProvider: (index: number) => void;
}

const phaseLabels: Record<AiGenerationState["phase"], string> = {
  idle: "Готово",
  waiting: "Ожидание",
  thinking: "Думает",
  generating: "Генерация",
};

export function AiPanel({
  open,
  settings,
  state,
  isRunning,
  editorAdapter,
  onClose,
  onGenerate,
  onStop,
  onSetActiveProvider,
}: AiPanelProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  if (!open) return null;

  const provider = settings.aiProviders[settings.aiActiveProvider];
  const canGenerate = Boolean(editorAdapter && provider && provider.apiKey && provider.url && provider.model && !isRunning);

  const run = (mode: GenerateMode) => {
    void onGenerate(mode, editorAdapter);
  };

  return (
    <aside className="absolute right-4 top-28 z-20 flex max-h-[calc(100vh-8rem)] w-96 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">ИИ генерация</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          Закрыть
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto p-4">
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-500">Провайдер</p>
              <p className="mt-1 truncate text-sm font-medium text-gray-900">{provider?.name || "Не выбран"}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{provider?.model || "Модель не задана"}</p>
            </div>
            <svg
              className={`ml-2 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && settings.aiProviders.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
              {settings.aiProviders.map((p, index) => {
                const isActive = index === settings.aiActiveProvider;
                return (
                  <button
                    key={`${p.name}-${index}`}
                    type="button"
                    onClick={() => {
                      onSetActiveProvider(index);
                      setDropdownOpen(false);
                    }}
                    className={`ai-provider-option flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "ai-provider-active bg-blue-600/10 text-blue-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-2 w-2 flex-shrink-0 rounded-full ${
                        isActive ? "bg-blue-600" : "bg-transparent"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name || `Провайдер ${index + 1}`}</p>
                      <p className="truncate text-xs text-gray-500">{p.model || "Модель не задана"}</p>
                    </div>
                    {!p.apiKey && (
                      <span className="flex-shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        нет ключа
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => run("full")}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Работа
          </button>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => run("partial")}
            className="btn-fragment rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Фрагмент
          </button>
        </div>

        {isRunning && (
          <button
            type="button"
            onClick={onStop}
            className="w-full rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Остановить
          </button>
        )}

        <div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{phaseLabels[state.phase]}</span>
            <span>{state.elapsed} сек</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${state.phase === "idle" ? 0 : state.phase === "waiting" ? 25 : state.phase === "thinking" ? 55 : 85}%` }}
            />
          </div>
        </div>

        {state.message && (
          <p className={`rounded-md px-3 py-2 text-sm ${state.message.includes("завершена") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {state.message}
          </p>
        )}

        {state.reasoning && (
          <div className="rounded-md border border-gray-200 bg-gray-50">
            <div className="border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500">
              Мысли модели
            </div>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap px-3 py-2 text-xs leading-5 text-gray-600">
              {state.reasoning}
            </pre>
          </div>
        )}

        {!provider?.apiKey && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Добавьте API ключ в настройках ИИ.
          </p>
        )}

        <p className="text-sm text-gray-500">
          Выделите тему или задание в редакторе, затем запустите генерацию.
        </p>
      </div>
    </aside>
  );
}
