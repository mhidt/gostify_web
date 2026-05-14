import { useCallback, useEffect, useRef, useState } from "react";
import type { DocxPluginSettings } from "@/core/settings";
import { generate, type EditorAdapter, type GenerateMode, type GenerationPhase } from "@/core/ai/generator";

export interface AiGenerationState {
  phase: GenerationPhase;
  elapsed: number;
  message: string | null;
  reasoning: string;
}

export function useAiGeneration(settings: DocxPluginSettings) {
  const [state, setState] = useState<AiGenerationState>({ phase: "idle", elapsed: 0, message: null, reasoning: "" });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const run = useCallback(
    async (mode: GenerateMode, editor: EditorAdapter | null) => {
      if (!editor || abortRef.current) {
        if (!editor) setState({ phase: "idle", elapsed: 0, message: "Редактор еще не готов.", reasoning: "" });
        return;
      }

      const abortController = new AbortController();
      abortRef.current = abortController;
      startedAtRef.current = Date.now();
      setState({ phase: "waiting", elapsed: 0, message: null, reasoning: "" });

      clearTimer();
      timerRef.current = window.setInterval(() => {
        setState((current) => ({
          ...current,
          elapsed: Math.round((Date.now() - startedAtRef.current) / 1000),
        }));
      }, 1000);

      await generate(
        editor,
        settings,
        mode,
        {
          onProgress: (phase, elapsed) => setState((current) => ({ ...current, phase, elapsed, message: null })),
          onReasoning: (text) => setState((current) => ({ ...current, reasoning: current.reasoning + text })),
          onError: (message) => setState((current) => ({ ...current, phase: "idle", elapsed: 0, message })),
          onComplete: (elapsed) =>
            setState((current) => ({ ...current, phase: "idle", elapsed, message: `Генерация завершена за ${elapsed} сек.` })),
        },
        abortController.signal,
      );

      abortRef.current = null;
      clearTimer();
    },
    [clearTimer, settings],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clearTimer();
    };
  }, [clearTimer]);

  return {
    state,
    generate: run,
    stop,
    isRunning: state.phase !== "idle",
  };
}
