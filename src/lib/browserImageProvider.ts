import type { ImageProvider } from "@/core/docx/imageProvider";
import { imageStore } from "@/lib/imageStore";

function createImageDimensions(buffer: ArrayBuffer, type: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(new Blob([buffer], { type }));

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(null);
    };

    img.src = blobUrl;
  });
}

export const browserImageProvider: ImageProvider = {
  async getImageBuffer(name) {
    return (await imageStore.get(name))?.buffer ?? null;
  },

  async getImageDimensions(name) {
    const entry = await imageStore.get(name);
    if (!entry) return null;

    return createImageDimensions(entry.buffer, entry.type);
  },
};
