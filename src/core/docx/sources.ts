const sourceCache = new Map<string, string>();

const SOURCE_PROXY = "/api/source-proxy?url=";
const FETCH_TIMEOUT = 10000;

export async function formatSource(url: string): Promise<string> {
  const cached = sourceCache.get(url);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(SOURCE_PROXY + encodeURIComponent(url), {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const title = doc.querySelector("title")?.innerText;
    const result = !title
      ? `Ресурс [Электронный ресурс]. – Режим доступа: ${url} (дата обращения: ${new Date().toLocaleDateString()}).`
      : `${title} [Электронный ресурс]. – Режим доступа: ${url} (дата обращения: ${new Date().toLocaleDateString()}).`;
    sourceCache.set(url, result);
    return result;
  } catch (error) {
    console.error("Ошибка при получении страницы:", error);
    const result = `Ресурс [Электронный ресурс]. – Режим доступа: ${url} (дата обращения: ${new Date().toLocaleDateString()}).`;
    sourceCache.set(url, result);
    return result;
  }
}

export function clearSourceCache(): void {
  sourceCache.clear();
}

export function getSourceCache(): Map<string, string> {
  return sourceCache;
}
