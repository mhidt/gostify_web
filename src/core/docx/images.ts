import { ImageRun, Paragraph } from "docx";
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
): Promise<ImageRun | Paragraph | null> {
  if (!isImage(text)) return null;

  const { fileName, requestedWidth } = parseImageTag(text);

  try {
    let buffer = imageBufferCache.get(fileName);
    if (!buffer) {
      const fetched = await imageProvider.getImageBuffer(fileName);
      if (!fetched) {
        console.warn("Не удалось найти изображение " + fileName);
        return new Paragraph("");
      }
      buffer = fetched;
      imageBufferCache.set(fileName, buffer);
    }

    const ext = fileName.split(".").pop() || "png";
    return new ImageRun({
      data: buffer,
      type: ext as any,
      transformation: await getImageDimensions(fileName, imageProvider, requestedWidth, settings),
    });
  } catch (e) {
    console.warn("Не удалось загрузить изображение " + fileName, e);
    return new Paragraph("");
  }
}

async function getImageDimensions(
  fileName: string,
  imageProvider: ImageProvider,
  requestedWidth: number | undefined,
  settings: DocxPluginSettings,
): Promise<{ width: number; height: number }> {
  const cached = imageDimCache.get(fileName);
  if (cached) {
    const width = resolveWidth(requestedWidth, settings);
    const scale = width / cached.width;
    return { width, height: cached.height * scale };
  }

  const dims = await imageProvider.getImageDimensions(fileName);
  if (dims) {
    imageDimCache.set(fileName, dims);
    const width = resolveWidth(requestedWidth, settings);
    const scale = width / dims.width;
    return { width, height: dims.height * scale };
  }

  return { width: resolveWidth(requestedWidth, settings), height: 300 };
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
