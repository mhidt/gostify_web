import { Image as ImageIcon } from "lucide-react";
import { DocxPluginSettings } from "@/core/settings";
import { Field, Toggle, PreviewHeader, CustomSelect, SEP_OPTS, NUM_OPTS } from "./shared";

interface ImagesSectionProps {
  settings: DocxPluginSettings;
  set: <K extends keyof DocxPluginSettings>(key: K, value: DocxPluginSettings[K]) => void;
}

export function ImagesSection({ settings, set }: ImagesSectionProps) {
  const imgPct = parseInt(settings.defaultImageSize) || 80;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">Размер по умолчанию</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} value={imgPct} step={5} onChange={e => { const v = Math.max(10, Number(e.target.value)); set("defaultImageSize", v + "%"); }} className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-blue-600" style={{ background: `linear-gradient(to right, var(--slider-fill, #2563eb) ${imgPct}%, var(--slider-track, #e5e7eb) ${imgPct}%)` }} />
          <span className="text-sm font-semibold text-gray-800 w-12 text-right tabular-nums shrink-0">{imgPct}%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Разделитель подписи"><CustomSelect value={settings.captionSeparator} options={SEP_OPTS} onChange={v => set("captionSeparator", v)} /></Field>
        <Field label="Нумерация рисунков"><CustomSelect value={settings.imageNumbering} options={NUM_OPTS} onChange={v => set("imageNumbering", v)} /></Field>
      </div>
      <Toggle label="Короткие подписи" value={settings.imageShortCaption} onChange={v => set("imageShortCaption", v)} />
      <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden mt-2">
        <PreviewHeader />
        <div className="px-6 py-4 flex flex-col items-center gap-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center transition-all" style={{ width: `${imgPct}%`, aspectRatio: "2/1" }}>
            <ImageIcon className="text-blue-300 transition-all" style={{ minWidth: 40, minHeight: 40, width: "33%", height: "33%" }} />
          </div>
          <p className="text-[11px] text-gray-500 transition-all">
            {settings.imageShortCaption ? "Рис." : "Рисунок"} {settings.imageNumbering === "byChapter" ? "1.1" : "1"}{settings.captionSeparator === "dash" ? " –" : "."} Схема процесса
          </p>
        </div>
      </div>
    </div>
  );
}
