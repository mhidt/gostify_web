import type { ChangeEvent } from "react";
import type { ImageEntry } from "@/hooks/useImages";

interface ImageManagerProps {
  images: ImageEntry[];
  open: boolean;
  onClose: () => void;
  onAddImage: (file: File) => Promise<string>;
  onRemoveImage: (name: string) => Promise<void>;
  onInsertImage: (name: string) => void;
}

export function ImageManager({
  images,
  open,
  onClose,
  onAddImage,
  onRemoveImage,
  onInsertImage,
}: ImageManagerProps) {
  if (!open) return null;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    for (const file of files) {
      await onAddImage(file);
    }
    event.target.value = "";
  };

  return (
    <aside className="absolute right-4 top-28 z-20 flex max-h-[calc(100vh-8rem)] w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Изображения</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          Закрыть
        </button>
      </div>

      <div className="border-b border-gray-200 px-4 py-3">
        <label className="inline-flex cursor-pointer items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
          Загрузить
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {images.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-gray-500">Пока нет загруженных изображений</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <div key={image.name} className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => onInsertImage(image.name)}
                  className="block aspect-video w-full bg-white"
                  title={`Вставить ${image.name}`}
                >
                  <img src={image.blobUrl} alt={image.name} className="h-full w-full object-contain" />
                </button>
                <div className="space-y-2 p-2">
                  <p className="truncate text-xs font-medium text-gray-800" title={image.name}>
                    {image.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => void onRemoveImage(image.name)}
                    className="w-full rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
