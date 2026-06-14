import { DocxPluginSettings } from "@/core/settings";
import { MarginField } from "./shared";

interface MarginsSectionProps {
  settings: DocxPluginSettings;
  set: <K extends keyof DocxPluginSettings>(key: K, value: DocxPluginSettings[K]) => void;
}

export function MarginsSection({ settings, set }: MarginsSectionProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <MarginField label="Верхнее, мм" value={settings.marginTop} onChange={v => set("marginTop", v)} w="w-36" />
      <div className="flex items-center gap-3">
        <MarginField label="Левое, мм" value={settings.marginLeft} onChange={v => set("marginLeft", v)} w="w-28" />
        <div className="w-28 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"><span className="text-[10px] text-gray-400">Страница</span></div>
        <MarginField label="Правое, мм" value={settings.marginRight} onChange={v => set("marginRight", v)} w="w-28" />
      </div>
      <MarginField label="Нижнее, мм" value={settings.marginBottom} onChange={v => set("marginBottom", v)} w="w-36" />
    </div>
  );
}
