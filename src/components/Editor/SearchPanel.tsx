import { useEffect, useRef, useState } from "react";
import { CaseSensitive, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { EditorView } from "@milkdown/kit/prose/view";
import { Button } from "@/components/ui/button";
import {
  clearSearch,
  getSearchState,
  goToSearchMatch,
  replaceAllSearchMatches,
  replaceCurrentSearchMatch,
  setSearchCaseSensitive,
  setSearchQuery,
  setSearchReplacement,
  type SearchState,
} from "@/lib/plugins/searchPlugin";

export type SearchPanelMode = "search" | "replace";

interface SearchPanelProps {
  mode: SearchPanelMode;
  view: EditorView;
  top: number;
  activationKey: number;
  onModeChange: (mode: SearchPanelMode) => void;
  onClose: () => void;
}

function toSearchSnapshot(view: EditorView): SearchState {
  return getSearchState(view.state);
}

export function SearchPanel({ mode, view, top, activationKey, onModeChange, onClose }: SearchPanelProps) {
  const [snapshot, setSnapshot] = useState(() => toSearchSnapshot(view));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSnapshot(toSearchSnapshot(view));
    requestAnimationFrame(() => {
      const input = mode === "replace" ? replaceInputRef.current : searchInputRef.current;
      input?.focus();
      input?.select();
    });
  }, [mode, view, activationKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSnapshot(toSearchSnapshot(view));
    }, 150);

    return () => window.clearInterval(interval);
  }, [view]);

  const currentLabel =
    snapshot.matches.length > 0 && snapshot.currentIndex >= 0
      ? `${snapshot.currentIndex + 1} из ${snapshot.matches.length}`
      : `0 из ${snapshot.matches.length}`;

  function closePanel() {
    clearSearch(view);
    onClose();
  }

  return (
    <div
      className="fixed right-4 z-30 w-[min(26rem,calc(100%-2rem))] rounded-md border border-gray-200 bg-white p-2 shadow-lg transition dark:border-gray-700 dark:bg-[#2c2c2a]"
      style={{ top }}
    >
      <div className="flex items-center gap-1">
        <Search className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        <input
          ref={searchInputRef}
          value={snapshot.query}
          onChange={(event) => {
            setSearchQuery(view, event.target.value);
            setSnapshot(toSearchSnapshot(view));
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              closePanel();
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              goToSearchMatch(view, event.shiftKey ? -1 : 1);
              setSnapshot(toSearchSnapshot(view));
            }
          }}
          placeholder="Найти"
          className="h-8 min-w-0 flex-1 rounded border border-gray-300 px-2 text-sm outline-none focus:border-gray-500 dark:border-gray-600"
        />
        <span className="w-14 shrink-0 text-center text-xs text-gray-500">{currentLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Предыдущее совпадение"
          onClick={() => {
            goToSearchMatch(view, -1);
            setSnapshot(toSearchSnapshot(view));
          }}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Следующее совпадение"
          onClick={() => {
            goToSearchMatch(view, 1);
            setSnapshot(toSearchSnapshot(view));
          }}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={snapshot.caseSensitive ? "outline" : "ghost"}
          size="icon"
          className="h-8 w-8"
          title="Учитывать регистр"
          onClick={() => {
            setSearchCaseSensitive(view, !snapshot.caseSensitive);
            setSnapshot(toSearchSnapshot(view));
          }}
        >
          <CaseSensitive className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Закрыть" onClick={closePanel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {mode === "replace" ? (
        <div className="mt-2 flex items-center gap-1 pl-5">
          <input
            ref={replaceInputRef}
            value={snapshot.replacement}
            onChange={(event) => {
              setSearchReplacement(view, event.target.value);
              setSnapshot(toSearchSnapshot(view));
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") {
                event.preventDefault();
                closePanel();
              }
            }}
            placeholder="Заменить на"
            className="h-8 min-w-0 flex-1 rounded border border-gray-300 px-2 text-sm outline-none focus:border-gray-500 dark:border-gray-600"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={snapshot.matches.length === 0}
            onClick={() => {
              replaceCurrentSearchMatch(view, snapshot.replacement);
              setSnapshot(toSearchSnapshot(view));
            }}
          >
            Заменить
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={snapshot.matches.length === 0}
            onClick={() => {
              replaceAllSearchMatches(view, snapshot.replacement);
              setSnapshot(toSearchSnapshot(view));
            }}
          >
            Все
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-2 ml-5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          onClick={() => onModeChange("replace")}
        >
          Замена
        </button>
      )}
    </div>
  );
}
