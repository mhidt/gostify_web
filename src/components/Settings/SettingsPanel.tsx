import { useState, useCallback } from "react";
import { DocxPluginSettings } from "@/core/settings";
import { AiSettings } from "@/components/Settings/AiSettings";
import { FontSection } from "@/components/Settings/FontSection";
import { ExportSection } from "@/components/Settings/ExportSection";
import { ImagesSection } from "@/components/Settings/ImagesSection";
import { MarginsSection } from "@/components/Settings/MarginsSection";
import { ManageSection } from "@/components/Settings/ManageSection";
import { Icon } from "@/components/Settings/shared";
import { Type, FileDown, Image, Ruler, WandSparkles, Settings, X } from "lucide-react";

interface SettingsPanelProps {
  settings: DocxPluginSettings;
  setSettings: (updater: Partial<DocxPluginSettings> | ((prev: DocxPluginSettings) => Partial<DocxPluginSettings>)) => void;
  resetSettings: () => void;
  open: boolean;
  onClose: () => void;
}

type NavKey = "font" | "export" | "manage" | "images" | "margins" | "ai";

const NAV_INFO: Record<NavKey, { t: string; d: string }> = {
  font: { t: "Оформление документа", d: "Шрифт, интервалы и заголовки" },
  export: { t: "Экспорт", d: "Формат и параметры экспорта" },
  manage: { t: "Управление настройками", d: "Экспорт, импорт и сброс" },
  images: { t: "Изображения", d: "Параметры изображений и подписей" },
  margins: { t: "Поля документа", d: "Размеры полей в миллиметрах" },
  ai: { t: "ИИ генерация", d: "Промты для генерации" },
};

export function SettingsPanel({ settings, setSettings, resetSettings, open, onClose }: SettingsPanelProps) {
  const [nav, setNav] = useState<NavKey>("font");
  const [headingTab, setHeadingTab] = useState<"chapters" | "paragraphs">("chapters");

  const set = useCallback(<K extends keyof DocxPluginSettings>(key: K, value: DocxPluginSettings[K]) => {
    setSettings({ [key]: value } as Partial<DocxPluginSettings>);
  }, [setSettings]);

  if (!open) return null;

  const navBtn = (key: NavKey, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setNav(key)}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors hover:bg-gray-100 ${nav === key ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-600"}`}
    >
      {icon}<span>{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 flex w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden mx-auto my-auto" style={{ height: 590 }}>
        <nav className="w-52 shrink-0 border-r border-gray-200 bg-gray-50 py-4 px-3 flex flex-col">
          <h2 className="text-sm font-bold text-gray-900 px-3 mb-3">Настройки</h2>
          <div className="space-y-0.5">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Основные</p>
            {navBtn("font", <Icon bg="bg-blue-50" text="text-blue-600"><Type className="w-3 h-3" /></Icon>, "Оформление")}
            {navBtn("export", <Icon bg="bg-emerald-50" text="text-emerald-600"><FileDown className="w-3 h-3" /></Icon>, "Экспорт")}
            {navBtn("manage", <Icon bg="bg-gray-100" text="text-gray-500"><Settings className="w-3 h-3" /></Icon>, "Управление")}
          </div>
          <div className="border-t border-gray-200 mx-3 my-3" />
          <div className="space-y-0.5 flex-1">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Расширенные</p>
            {navBtn("images", <Icon bg="bg-amber-50" text="text-amber-600"><Image className="w-3 h-3" /></Icon>, "Изображения")}
            {navBtn("margins", <Icon bg="bg-sky-50" text="text-sky-600"><Ruler className="w-3 h-3" /></Icon>, "Поля")}
            {navBtn("ai", <Icon bg="bg-purple-50" text="text-purple-600"><WandSparkles className="w-3 h-3" /></Icon>, "ИИ")}
          </div>
          <div className="pt-3 px-3 border-t border-gray-200">
            <button onClick={resetSettings} className="w-full h-8 rounded-lg border border-red-200 text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors">Сбросить до ГОСТ</button>
          </div>
        </nav>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900">{NAV_INFO[nav].t}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{NAV_INFO[nav].d}</p>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 thin-scroll">
            {nav === "font" && <FontSection settings={settings} set={set} headingTab={headingTab} setHeadingTab={setHeadingTab} />}
            {nav === "export" && <ExportSection settings={settings} set={set} />}
            {nav === "images" && <ImagesSection settings={settings} set={set} />}
            {nav === "margins" && <MarginsSection settings={settings} set={set} />}
            {nav === "ai" && <AiSettings settings={settings} setSettings={setSettings} />}
            {nav === "manage" && <ManageSection settings={settings} setSettings={setSettings} resetSettings={resetSettings} />}
          </div>
        </div>
      </div>
    </div>
  );
}
