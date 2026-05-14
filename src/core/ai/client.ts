interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

type ReasoningDelta = {
  content?: unknown;
  reasoning?: unknown;
  reasoning_content?: unknown;
  reasoningContent?: unknown;
  thinking?: unknown;
  thinking_content?: unknown;
  reasoning_details?: unknown;
};

export interface StreamOptions {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  onChunk: (text: string) => void;
  onReasoning?: (text: string) => void;
  onFirstToken?: () => void;
  signal?: AbortSignal;
}

function getResetMinutes(headers: Headers): number | null {
  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const sec = Number(retryAfter);
    if (sec > 0) return Math.ceil(sec / 60);
  }

  const ratelimitReset = headers.get("x-ratelimit-reset");
  if (ratelimitReset) {
    const val = Number(ratelimitReset);
    if (val > 1e9) {
      const sec = val - Math.floor(Date.now() / 1000);
      return sec > 0 ? Math.ceil(sec / 60) : null;
    }
    if (val > 0) return Math.ceil(val / 60);
  }

  return null;
}

async function formatApiError(response: Response): Promise<string> {
  const body = await response.text();

  if (response.status === 429) {
    const min = getResetMinutes(response.headers);
    if (min && min > 0) {
      return min > 1
        ? `Слишком много запросов. Попробуйте через ~${min} мин.`
        : "Слишком много запросов. Попробуйте через ~1 мин.";
    }
    return "Слишком много запросов. Попробуйте через пару минут.";
  }

  if (response.status === 401) return "Неверный API ключ. Проверьте ключ в настройках.";
  if (response.status === 403) return "Доступ запрещен. Проверьте API ключ и права.";
  if (response.status === 402) return "Недостаточно средств на балансе провайдера.";
  if (response.status === 404) return "Модель не найдена. Проверьте название модели в настройках.";
  if (response.status === 413) return "Запрос слишком длинный. Уменьшите объем текста.";
  if (response.status === 500 || response.status === 502 || response.status === 503) {
    return "Сервер провайдера временно недоступен. Попробуйте позже.";
  }
  if (response.status === 504) return "Время ожидания ответа истекло. Попробуйте еще раз.";

  try {
    const parsed = JSON.parse(body);
    const message = parsed?.error?.message || parsed?.message || parsed?.msg || "";
    if (message) return `Ошибка API (${response.status}): ${message}`;
  } catch {
    // Keep the generic error below.
  }

  return `Ошибка API: код ${response.status}`;
}

function resolveBrowserUrl(url: string) {
  if (url.startsWith("/")) return url;
  const workerProxyUrl = import.meta.env.VITE_AI_PROXY_URL;
  if (workerProxyUrl) return `${workerProxyUrl}?url=${encodeURIComponent(url)}`;
  if (import.meta.env.DEV) return `/api/ai-proxy?url=${encodeURIComponent(url)}`;

  return url;
}

export async function streamCompletion(options: StreamOptions): Promise<void> {
  const { url, apiKey, model, systemPrompt, userMessage, onChunk, onReasoning, onFirstToken, signal } = options;

  if (!apiKey.trim()) throw new Error("Укажите API ключ в настройках.");
  if (!url.trim()) throw new Error("Укажите URL API в настройках.");
  if (!model.trim()) throw new Error("Укажите модель в настройках.");

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const body: Record<string, unknown> = { model, messages, stream: true };
  if (url.includes("openrouter")) body.include_reasoning = true;
  if (url.includes("fireworks.ai")) body.reasoning_effort = "medium";
  const requestUrl = resolveBrowserUrl(url);

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) throw new Error(await formatApiError(response));
  if (!response.body) throw new Error("Провайдер не вернул поток данных.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let firstTokenFired = false;
  let inThinking = false;
  let contentBuffer = "";
  let sseBuffer = "";
  let lastDataTime = Date.now();

  const thinkStart = "<think>";
  const thinkEnd = "</think>";

  const fireFirstToken = () => {
    if (!firstTokenFired) {
      firstTokenFired = true;
      onFirstToken?.();
    }
  };

  const processContent = (content: string) => {
    fireFirstToken();
    contentBuffer += content;

    while (contentBuffer.length > 0) {
      if (inThinking) {
        const endIndex = contentBuffer.indexOf(thinkEnd);
        if (endIndex !== -1) {
          const thinkingPart = contentBuffer.slice(0, endIndex);
          if (thinkingPart) onReasoning?.(thinkingPart);
          contentBuffer = contentBuffer.slice(endIndex + thinkEnd.length);
          inThinking = false;
        } else {
          onReasoning?.(contentBuffer);
          contentBuffer = "";
          break;
        }
      } else {
        const startIndex = contentBuffer.indexOf(thinkStart);
        if (startIndex !== -1) {
          const before = contentBuffer.slice(0, startIndex);
          if (before) onChunk(before);

          const afterTag = contentBuffer.slice(startIndex + thinkStart.length);
          const endIndex = afterTag.indexOf(thinkEnd);
          if (endIndex !== -1) {
            const thinkingPart = afterTag.slice(0, endIndex);
            if (thinkingPart) onReasoning?.(thinkingPart);
            contentBuffer = afterTag.slice(endIndex + thinkEnd.length);
          } else {
            inThinking = true;
            if (afterTag) onReasoning?.(afterTag);
            contentBuffer = "";
            break;
          }
        } else {
          const tail = contentBuffer.slice(-thinkStart.length);
          if (tail.length < contentBuffer.length && thinkStart.startsWith(tail)) {
            onChunk(contentBuffer.slice(0, contentBuffer.length - tail.length));
            contentBuffer = tail;
          } else {
            onChunk(contentBuffer);
            contentBuffer = "";
          }
          break;
        }
      }
    }
  };

  const processSseLines = (text: string) => {
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") return true;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;

        const reasoning = extractReasoning(delta);

        if (reasoning) {
          fireFirstToken();
          onReasoning?.(reasoning);
        }
        if (typeof delta.content === "string") processContent(delta.content);
      } catch {
        // Ignore malformed SSE fragments.
      }
    }

    return false;
  };

  const flushContent = () => {
    if (!contentBuffer) return;
    if (inThinking) onReasoning?.(contentBuffer);
    else onChunk(contentBuffer);
    contentBuffer = "";
  };

  while (true) {
    if (Date.now() - lastDataTime > 30_000) break;

    const read = await reader.read();
    if (read.done) break;

    lastDataTime = Date.now();
    sseBuffer += decoder.decode(read.value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() ?? "";

    if (processSseLines(lines.join("\n"))) break;
  }

  if (sseBuffer.trim()) processSseLines(sseBuffer);
  flushContent();
}

function extractReasoning(delta: ReasoningDelta): string {
  if (typeof delta.reasoning_content === "string") return delta.reasoning_content;
  if (typeof delta.reasoningContent === "string") return delta.reasoningContent;
  if (typeof delta.reasoning === "string") return delta.reasoning;
  if (typeof delta.thinking === "string") return delta.thinking;
  if (typeof delta.thinking_content === "string") return delta.thinking_content;

  if (delta.reasoning && typeof delta.reasoning === "object") {
    const reasoning = delta.reasoning as ReasoningDelta;
    if (typeof reasoning.content === "string") return reasoning.content;
    if (typeof reasoning.reasoning_content === "string") return reasoning.reasoning_content;
  }

  if (Array.isArray(delta.reasoning_details)) {
    return delta.reasoning_details
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const detail = part as { text?: unknown; content?: unknown; reasoning_content?: unknown };
          if (typeof detail.text === "string") return detail.text;
          if (typeof detail.content === "string") return detail.content;
          if (typeof detail.reasoning_content === "string") return detail.reasoning_content;
        }
        return "";
      })
      .join("");
  }

  return "";
}
