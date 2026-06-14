import { useState, useRef } from "react";
import { DocxPluginSettings, DEFAULT_SETTINGS } from "@/core/settings";
import { WandSparkles, X, Upload, Download, Copy, Check, File } from "lucide-react";

interface ManageSectionProps {
  settings: DocxPluginSettings;
  setSettings: (updater: Partial<DocxPluginSettings> | ((prev: DocxPluginSettings) => Partial<DocxPluginSettings>)) => void;
  resetSettings: () => void;
}

const AI_PROMPT = `Сгенерируй настройки для оформления документа по ГОСТ на основе методички. Верни ТОЛЬКО JSON без markdown-обёрток, пояснений и комментариев.

Пример результата:
{
  "fontSize": 14,
  "lineSpacing": 1.5,
  "firstLineIndent": 1.25,
  "chapterFontSize": 16,
  "chapterBold": true,
  "chapterAlignment": "center",
  "chapterPrefix": false,
  "chapterDot": true,
  "chapterAllCaps": false,
  "chapterIndent": false,
  "paragraphFontSize": 14,
  "paragraphBold": true,
  "paragraphAlignment": "justified",
  "paragraphDot": true,
  "paragraphIndent": false,
  "saveFormat": "doc",
  "linksAtEndOfSentence": false,
  "skipBibliography": false,
  "defaultImageSize": "80%",
  "captionSeparator": "dot",
  "imageNumbering": "sequential",
  "tableNumbering": "sequential",
  "listingNumbering": "sequential",
  "imageShortCaption": false,
  "marginTop": 20,
  "marginLeft": 30,
  "marginRight": 20,
  "marginBottom": 20,
  "aiSystemPromptFull": "",
  "aiSystemPromptPartial": ""
}

Возможные значения:
- fontSize: число (pt), обычно 12 или 14
- lineSpacing: 1 | 1.5 | 2
- firstLineIndent: число (см), обычно 1.25
- chapterFontSize: 14 | 16 | 18
- chapterBold, chapterPrefix, chapterDot, chapterAllCaps, chapterIndent: true|false
- chapterAlignment: "center" | "left" | "justified"
- paragraphFontSize: 12 | 14 | 16 | 18
- paragraphBold, paragraphDot, paragraphIndent: true|false
- paragraphAlignment: "center" | "left" | "justified"
- saveFormat: "doc" | "docx"
- linksAtEndOfSentence, skipBibliography: true|false
- defaultImageSize: строка "10%"–"100%"
- captionSeparator: "dot" | "dash"
- imageNumbering, tableNumbering, listingNumbering: "sequential" | "byChapter"
- imageShortCaption: true|false
- marginTop/Left/Right/Bottom: число (мм)
- aiSystemPromptFull, aiSystemPromptPartial: строка`;

function extractJSON(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

export function ManageSection({ settings, setSettings, resetSettings }: ManageSectionProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gostify-settings.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function applyImport(obj: Record<string, unknown>) {
    const partial: Partial<DocxPluginSettings> = {};
    const keys = Object.keys(DEFAULT_SETTINGS) as (keyof DocxPluginSettings)[];
    for (const k of keys) {
      if (obj[k] !== undefined) (partial as Record<string, unknown>)[k] = obj[k];
    }
    setSettings(partial);
    setImportOpen(false);
    setImportText("");
  }

  function handleImportText() {
    if (!importText.trim()) return;
    try {
      const obj = extractJSON(importText);
      if (!obj) throw new Error();
      applyImport(obj);
    } catch { alert("Не удалось распознать JSON"); }
  }

  function handleImportFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = extractJSON(e.target?.result as string);
        if (!obj) throw new Error();
        applyImport(obj);
      } catch { alert("Не удалось распознать JSON"); }
    };
    reader.readAsText(file);
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={handleExport} className="h-20 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"><Upload className="w-4 h-4" /></div>
            <span className="text-sm font-medium text-gray-700">Экспорт</span>
          </button>
          <button onClick={() => setImportOpen(true)} className="h-20 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"><Download className="w-4 h-4" /></div>
            <span className="text-sm font-medium text-gray-700">Импорт</span>
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2"><WandSparkles className="w-3.5 h-3.5 text-purple-400" /><span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Промт для ИИ</span></div>
          <div className="px-4 py-3">
            <p className="text-[12px] text-gray-500 leading-relaxed mb-3">Скопируйте промт ниже, отправьте его ИИ вместе с методичкой вашего вуза — и он сгенерирует настройки, которые можно импортировать сюда.</p>
            <div className="relative">
              <pre className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{AI_PROMPT}</pre>
              <button onClick={handleCopyPrompt} className="absolute top-2 right-2 h-7 px-2.5 rounded-md bg-white border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1 cursor-pointer">
                {copied ? <><Check className="w-3 h-3" />Скопировано</> : <><Copy className="w-3 h-3" />Копировать</>}
              </button>
            </div>
          </div>
        </div>
        <button onClick={resetSettings} className="w-full h-10 rounded-lg border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">Сбросить до ГОСТ</button>
      </div>

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-96 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Импорт настроек</h3>
              <button onClick={() => { setImportOpen(false); setImportText(""); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">Вставьте JSON</label>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={5} placeholder='{"fontSize": 14, ...}' className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none font-mono" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-[11px] text-gray-400 font-medium">или</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <button onClick={() => fileRef.current?.click()} className="w-full h-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"><File className="w-4 h-4" />Выбрать файл</button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
              <button onClick={handleImportText} className="w-full h-10 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Импортировать</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
