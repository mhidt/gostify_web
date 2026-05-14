import type { DocxPluginSettings } from "@/core/settings";
import { streamCompletion } from "@/core/ai/client";
import { buildFullPrompt, buildPartialPrompt, getSystemPrompt } from "@/core/ai/prompts";

export type GenerateMode = "full" | "partial";
export type GenerationPhase = "idle" | "waiting" | "thinking" | "generating";

export interface EditorSelectionRange {
  from: number;
  to: number;
}

export interface EditorAdapter {
  getSelection(): string;
  getSelectionRange(): EditorSelectionRange;
  getValue(): string;
  replaceRange(from: number, to: number, text: string): number;
  replaceReasoning(from: number, to: number, text: string): number;
  changeSelectionCase(): void;
  insertImageDescriptions(): void;
  setCursor(pos: number): void;
  focus(): void;
}

export interface GenerationCallbacks {
  onProgress: (phase: GenerationPhase, elapsed: number) => void;
  onReasoning?: (text: string) => void;
  onError: (message: string) => void;
  onComplete: (elapsed: number) => void;
}

export async function generate(
  editor: EditorAdapter,
  settings: DocxPluginSettings,
  mode: GenerateMode,
  callbacks: GenerationCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const selected = editor.getSelection();
  if (!selected.trim()) {
    callbacks.onError("Выделите текст: тему работы или задание для генерации.");
    return;
  }

  const provider = settings.aiProviders[settings.aiActiveProvider];
  if (!provider) {
    callbacks.onError("Добавьте провайдер в настройках.");
    return;
  }

  const userPrompt = mode === "full" ? settings.aiSystemPromptFull : settings.aiSystemPromptPartial;
  const systemPrompt = getSystemPrompt(mode, userPrompt);
  const userMessage = mode === "full" ? buildFullPrompt(selected) : buildPartialPrompt(editor.getValue(), selected);
  const startRange = editor.getSelectionRange();
  const savedSelection = selected;
  const startTime = Date.now();
  const elapsed = () => Math.round((Date.now() - startTime) / 1000);

  let insertPos = startRange.from;
  let reasoningStarted = false;
  let contentStarted = false;
  let generated = "";
  let generatedEndPos = startRange.from;
  let pendingContent = "";
  let contentPumpTimer: number | null = null;
  let reasoningBuffer = "";
  let reasoningLineStarted = false;
  let reasoningText = "";
  let reasoningPumpTimer: number | null = null;

  const flushReasoningSlice = () => {
    if (!reasoningBuffer) return;
    const raw = reasoningBuffer.slice(0, 80);
    reasoningBuffer = reasoningBuffer.slice(raw.length);

    let formatted = "";
    for (const char of raw) {
      if (!reasoningLineStarted) reasoningLineStarted = true;
      formatted += char;
      if (char === "\n") reasoningLineStarted = false;
    }

    reasoningText += formatted;
    insertPos = editor.replaceReasoning(startRange.from, insertPos, reasoningText);
    editor.setCursor(insertPos);
  };

  const startReasoningPump = () => {
    if (reasoningPumpTimer) return;
    reasoningPumpTimer = window.setInterval(() => {
      flushReasoningSlice();
      if (!reasoningBuffer && reasoningPumpTimer) {
        window.clearInterval(reasoningPumpTimer);
        reasoningPumpTimer = null;
      }
    }, 35);
  };

  const removeReasoning = () => {
    if (reasoningPumpTimer) window.clearInterval(reasoningPumpTimer);
    reasoningPumpTimer = null;
    reasoningBuffer = "";
    reasoningText = "";
    if (!reasoningStarted) return;
    insertPos = editor.replaceRange(startRange.from, insertPos, "");
    generatedEndPos = insertPos;
    reasoningLineStarted = false;
  };

  const flushContentSlice = () => {
    if (!pendingContent) return;
    const text = pendingContent.slice(0, 120);
    pendingContent = pendingContent.slice(text.length);
    generated += text;
    generatedEndPos = editor.replaceRange(startRange.from, generatedEndPos, generated);
    editor.setCursor(generatedEndPos);
  };

  const startContentPump = () => {
    if (contentPumpTimer) return;
    contentPumpTimer = window.setInterval(() => {
      flushContentSlice();
      if (!pendingContent && contentPumpTimer) {
        window.clearInterval(contentPumpTimer);
        contentPumpTimer = null;
      }
    }, 35);
  };

  const waitForPumps = () => {
    if (reasoningBuffer) startReasoningPump();
    if (pendingContent) startContentPump();

    return new Promise<void>((resolve) => {
      const waiter = window.setInterval(() => {
        if (!reasoningBuffer && !pendingContent && !reasoningPumpTimer && !contentPumpTimer) {
          window.clearInterval(waiter);
          resolve();
        }
      }, 35);
    });
  };

  editor.focus();
  insertPos = editor.replaceRange(startRange.from, startRange.to, "");
  generatedEndPos = insertPos;
  editor.setCursor(insertPos);

  try {
    callbacks.onProgress("waiting", elapsed());

    await streamCompletion({
      url: provider.url,
      apiKey: provider.apiKey,
      model: provider.model,
      systemPrompt,
      userMessage,
      signal,
      onFirstToken: () => callbacks.onProgress("thinking", elapsed()),
      onReasoning: (chunk) => {
        if (!chunk) return;
        reasoningStarted = true;
        reasoningBuffer += chunk;
        callbacks.onReasoning?.(chunk);
        callbacks.onProgress("thinking", elapsed());
        startReasoningPump();
      },
      onChunk: (chunk) => {
        if (reasoningStarted && !contentStarted) {
          contentStarted = true;
          removeReasoning();
        }
        pendingContent += chunk;
        callbacks.onProgress("generating", elapsed());
        startContentPump();
      },
    });

    await waitForPumps();
    if (reasoningStarted && !contentStarted) removeReasoning();
    callbacks.onComplete(elapsed());
  } catch (error) {
    if (reasoningPumpTimer) window.clearInterval(reasoningPumpTimer);
    if (contentPumpTimer) window.clearInterval(contentPumpTimer);
    reasoningPumpTimer = null;
    contentPumpTimer = null;
    editor.replaceRange(startRange.from, Math.max(insertPos, generatedEndPos), savedSelection);
    editor.setCursor(startRange.from + savedSelection.length);

    if (error instanceof DOMException && error.name === "AbortError") {
      callbacks.onError("Генерация остановлена.");
      return;
    }

    callbacks.onError(error instanceof Error ? error.message : "Ошибка генерации.");
  }
}
