import { ImageRun } from "docx";
import { isImage, parseImageTag, parseSizeValue } from "../editor/utils";
import { DocxPluginSettings } from "../settings";
import { ImageProvider } from "./imageProvider";

const MM_TO_PX = 3.78;
const A4_WIDTH_MM = 210;

const imageBufferCache = new Map<string, ArrayBuffer>();
const imageDimCache = new Map<string, { width: number; height: number }>();

export function clearImageCache(): void {
  imageBufferCache.clear();
  imageDimCache.clear();
}

export async function renderImage(
  text: string,
  imageProvider: ImageProvider,
  settings: DocxPluginSettings,
): Promise<ImageRun | null> {
  if (!isImage(text)) return null;

  const { fileName, url, requestedWidth } = parseImageTag(text);

  try {
    const cacheKey = url || fileName;
    let buffer = imageBufferCache.get(cacheKey);
    if (!buffer) {
      if (url) {
        const fetched = await fetchImageBuffer(url);
        if (!fetched) return null;
        buffer = fetched;
      } else {
        const fetched = await imageProvider.getImageBuffer(fileName);
        if (!fetched) {
          console.warn("Не удалось найти изображение " + fileName);
          return null;
        }
        buffer = fetched;
      }
      imageBufferCache.set(cacheKey, buffer);
    }

    const ext = (url || fileName).split(/[?#]/)[0]!.split(".").pop() || "png";
    return new ImageRun({
      data: buffer,
      type: ext as any,
      transformation: await getImageDimensions(cacheKey, url ? null : imageProvider, requestedWidth, settings),
    });
  } catch (e) {
    console.warn("Не удалось загрузить изображение " + (url || fileName), e);
    return null;
  }
}

async function getImageDimensions(
  cacheKey: string,
  imageProvider: ImageProvider | null,
  requestedWidth: number | undefined,
  settings: DocxPluginSettings,
): Promise<{ width: number; height: number }> {
  const cached = imageDimCache.get(cacheKey);
  if (cached) {
    const width = resolveWidth(requestedWidth, settings);
    const scale = width / cached.width;
    return { width, height: cached.height * scale };
  }

  if (imageProvider) {
    const dims = await imageProvider.getImageDimensions(cacheKey);
    if (dims) {
      imageDimCache.set(cacheKey, dims);
      const width = resolveWidth(requestedWidth, settings);
      const scale = width / dims.width;
      return { width, height: dims.height * scale };
    }
  }

  const buffer = imageBufferCache.get(cacheKey);
  if (buffer) {
    const dims = await getDimensionsFromBuffer(buffer);
    if (dims) {
      imageDimCache.set(cacheKey, dims);
      const width = resolveWidth(requestedWidth, settings);
      const scale = width / dims.width;
      return { width, height: dims.height * scale };
    }
  }

  return { width: resolveWidth(requestedWidth, settings), height: 300 };
}

function getDimensionsFromBuffer(buffer: ArrayBuffer): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function fetchImageBuffer(imageUrl: string): Promise<ArrayBuffer | null> {
  // 1. Server-side proxy (bypasses CORS reliably)
  try {
    const proxyUrl = "/api/image-proxy?url=" + encodeURIComponent(imageUrl);
    const response = await fetch(proxyUrl);
    if (response.ok) return response.arrayBuffer();
  } catch { /* proxy not available, try direct */ }

  // 2. Direct fetch (works when server sends CORS headers)
  try {
    const response = await fetch(imageUrl);
    if (response.ok) return response.arrayBuffer();
  } catch { /* CORS or network error */ }

  console.warn("Не удалось скачать изображение " + imageUrl);
  return null;
}

function resolveWidth(requestedWidth: number | undefined, settings: DocxPluginSettings): number {
  if (requestedWidth !== undefined) return requestedWidth;

  const parsed = parseSizeValue(settings.defaultImageSize);
  if (!parsed) return 400;

  if ("px" in parsed) return parsed.px;

  const contentWidthMm = A4_WIDTH_MM - settings.marginLeft - settings.marginRight;
  const contentWidthPx = contentWidthMm * MM_TO_PX;
  return contentWidthPx * (parsed.percent / 100);
}
