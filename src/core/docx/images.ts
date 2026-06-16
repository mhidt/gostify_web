import { ImageRun } from "docx";
import { isImage, parseImageTag, parseSizeValue } from "../editor/utils";
import { DocxPluginSettings } from "../settings";
import { ImageProvider } from "./imageProvider";

const MM_TO_PX = 3.78;
const A4_WIDTH_MM = 210;

const imageBufferCache = new Map<string, ArrayBuffer>();
const imageContentTypeCache = new Map<string, string | null>();
const imageDimCache = new Map<string, { width: number; height: number }>();

const VALID_IMAGE_TYPES = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"];

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function resolveImageType(urlOrFileName: string, contentType: string | null): string {
  const pathPart = urlOrFileName.split(/[?#]/)[0]!;
  const ext = pathPart.split(".").pop()!;
  if (VALID_IMAGE_TYPES.includes(ext.toLowerCase())) return ext.toLowerCase() === "jpeg" ? "jpg" : ext.toLowerCase();

  if (contentType) {
    const mime = contentType.split(";")[0]!.trim();
    const mapped = MIME_TO_EXT[mime];
    if (mapped) return mapped;
  }

  return "png";
}

export function clearImageCache(): void {
  imageBufferCache.clear();
  imageContentTypeCache.clear();
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
        buffer = fetched.buffer;
        imageContentTypeCache.set(cacheKey, fetched.contentType);
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

    const type = resolveImageType(url || fileName, imageContentTypeCache.get(cacheKey) ?? null);
    return new ImageRun({
      data: buffer,
      type: type as any,
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

async function fetchImageBuffer(imageUrl: string): Promise<{ buffer: ArrayBuffer; contentType: string | null } | null> {
  try {
    const proxyUrl = "/api/image-proxy?url=" + encodeURIComponent(imageUrl);
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return { buffer: await response.arrayBuffer(), contentType: response.headers.get("Content-Type") };
    }
  } catch { /* proxy not available, try direct */ }

  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      return { buffer: await response.arrayBuffer(), contentType: response.headers.get("Content-Type") };
    }
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
