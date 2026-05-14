import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { imageStore } from "@/lib/imageStore";

export interface ImageEntry {
  name: string;
  type: string;
  blobUrl: string;
}

function splitFileName(name: string) {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return { base: name, ext: "" };

  return {
    base: name.slice(0, dotIndex),
    ext: name.slice(dotIndex),
  };
}

async function createUniqueName(fileName: string) {
  const existing = new Set((await imageStore.list()).map((entry) => entry.name));
  if (!existing.has(fileName)) return fileName;

  const { base, ext } = splitFileName(fileName);
  let index = 1;
  let nextName = `${base}-${index}${ext}`;

  while (existing.has(nextName)) {
    index += 1;
    nextName = `${base}-${index}${ext}`;
  }

  return nextName;
}

function getDimensionsFromBlobUrl(blobUrl: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = blobUrl;
  });
}

export function useImages() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [ready, setReady] = useState(false);
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  const revokeBlobUrls = useCallback(() => {
    for (const blobUrl of blobUrlsRef.current.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    blobUrlsRef.current = new Map();
  }, []);

  const loadImages = useCallback(async () => {
    const list = await imageStore.list();
    const nextImages: ImageEntry[] = [];
    const activeNames = new Set(list.map((entry) => entry.name));

    for (const { name, type } of list) {
      const entry = await imageStore.get(name);
      if (!entry) continue;

      let blobUrl = blobUrlsRef.current.get(name);
      if (!blobUrl) {
        blobUrl = URL.createObjectURL(new Blob([entry.buffer], { type: entry.type }));
        blobUrlsRef.current.set(name, blobUrl);
      }
      nextImages.push({ name, type, blobUrl });
    }

    for (const [name, blobUrl] of blobUrlsRef.current.entries()) {
      if (!activeNames.has(name)) {
        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current.delete(name);
      }
    }

    setImages(nextImages);
    setReady(true);
  }, []);

  useEffect(() => {
    void loadImages();

    return () => {
      revokeBlobUrls();
    };
  }, [loadImages, revokeBlobUrls]);

  const addImage = useCallback(
    async (file: File) => {
      const name = await createUniqueName(file.name);
      const buffer = await file.arrayBuffer();
      await imageStore.put(name, buffer, file.type || "application/octet-stream");
      const type = file.type || "application/octet-stream";
      const blobUrl = URL.createObjectURL(new Blob([buffer], { type }));
      blobUrlsRef.current.set(name, blobUrl);
      setImages((current) => [...current, { name, type, blobUrl }]);

      return name;
    },
    [],
  );

  const removeImage = useCallback(
    async (name: string) => {
      await imageStore.delete(name);
      await loadImages();
    },
    [loadImages],
  );

  const getImageBuffer = useCallback(async (name: string) => {
    return (await imageStore.get(name))?.buffer ?? null;
  }, []);

  const getImageDimensions = useCallback(
    async (name: string) => {
      const image = images.find((entry) => entry.name === name);
      if (image) return getDimensionsFromBlobUrl(image.blobUrl);

      const entry = await imageStore.get(name);
      if (!entry) return null;

      const blobUrl = URL.createObjectURL(new Blob([entry.buffer], { type: entry.type }));
      try {
        return await getDimensionsFromBlobUrl(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    },
    [images],
  );

  const imageUrls = useMemo(() => {
    return new Map(images.map((image) => [image.name, image.blobUrl]));
  }, [images]);

  const getImageBlobUrl = useCallback((name: string) => {
    return blobUrlsRef.current.get(name) ?? null;
  }, []);

  return {
    images,
    imageUrls,
    ready,
    addImage,
    removeImage,
    getImageBuffer,
    getImageDimensions,
    getImageBlobUrl,
  };
}
