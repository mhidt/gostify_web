import { DocxPluginSettings } from "@/core/settings";
import { AiSettings } from "@/components/Settings/AiSettings";

interface SettingsPanelProps {
  settings: DocxPluginSettings;
  setSettings: (updater: Partial<DocxPluginSettings> | ((prev: DocxPluginSettings) => Partial<DocxPluginSettings>)) => void;
  resetSettings: () => void;
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ settings, setSettings, resetSettings, open, onClose }: SettingsPanelProps) {
  if (!open) return null;

  const set = <K extends keyof DocxPluginSettings>(key: K, value: DocxPluginSettings[K]) => {
    setSettings({ [key]: value } as Partial<DocxPluginSettings>);
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 max-h-full w-full overflow-auto bg-white shadow-xl sm:w-96">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3">
          <h2 className="text-lg font-bold">Настройки</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
        </div>

        <div className="p-4 space-y-6">
          <Section title="Шрифт">
            <NumberField label="Размер шрифта (пт)" value={settings.fontSize} onChange={(v) => set("fontSize", v)} />
            <SelectField label="Межстрочный интервал" value={String(settings.lineSpacing)} options={{ "1": "Одинарный", "1.15": "1.15", "1.5": "Полуторный", "2": "Двойной" }} onChange={(v) => set("lineSpacing", Number(v))} />
            <NumberField label="Абзацный отступ (см)" value={settings.firstLineIndent} onChange={(v) => set("firstLineIndent", v)} step={0.25} />
          </Section>

          <Section title="Заголовки глав (#)">
            <SelectField label="Размер шрифта (пт)" value={String(settings.chapterFontSize)} options={{ "14": "14", "16": "16", "18": "18" }} onChange={(v) => set("chapterFontSize", Number(v))} />
            <ToggleField label="Жирное начертание" value={settings.chapterBold} onChange={(v) => set("chapterBold", v)} />
            <SelectField label="Выравнивание" value={settings.chapterAlignment} options={{ center: "По центру", left: "По левому краю", justified: "По ширине" }} onChange={(v) => set("chapterAlignment", v)} />
            <ToggleField label="Слово «глава» перед номером" value={settings.chapterPrefix} onChange={(v) => set("chapterPrefix", v)} />
            <ToggleField label="Заглавные буквы" value={settings.chapterAllCaps} onChange={(v) => set("chapterAllCaps", v)} />
            <ToggleField label="Точка после номера" value={settings.chapterDot} onChange={(v) => set("chapterDot", v)} />
            <ToggleField label="Абзацный отступ" value={settings.chapterIndent} onChange={(v) => set("chapterIndent", v)} />
          </Section>

          <Section title="Заголовки параграфов (##)">
            <SelectField label="Размер шрифта (пт)" value={String(settings.paragraphFontSize)} options={{ "14": "14", "16": "16", "18": "18" }} onChange={(v) => set("paragraphFontSize", Number(v))} />
            <ToggleField label="Жирное начертание" value={settings.paragraphBold} onChange={(v) => set("paragraphBold", v)} />
            <SelectField label="Выравнивание" value={settings.paragraphAlignment} options={{ center: "По центру", left: "По левому краю", justified: "По ширине" }} onChange={(v) => set("paragraphAlignment", v)} />
            <ToggleField label="Точка после номера" value={settings.paragraphDot} onChange={(v) => set("paragraphDot", v)} />
            <ToggleField label="Абзацный отступ" value={settings.paragraphIndent} onChange={(v) => set("paragraphIndent", v)} />
          </Section>

          <Section title="Изображения">
            <TextField label="Размер по умолчанию" value={settings.defaultImageSize} onChange={(v) => set("defaultImageSize", v)} hint="Число (px) или процент (80%)" />
            <ToggleField label="Сокращать «Рисунок»" value={settings.imageShortCaption} onChange={(v) => set("imageShortCaption", v)} />
            <SelectField label="Разделитель после номера" value={settings.imageCaptionSeparator} options={{ dot: ". (точка)", dash: "– (тире)" }} onChange={(v) => set("imageCaptionSeparator", v)} />
            <SelectField label="Нумерация рисунков" value={settings.imageNumbering} options={{ sequential: "Сквозная (1, 2, 3...)", byChapter: "По разделам (1.1, 1.2...)" }} onChange={(v) => set("imageNumbering", v)} />
          </Section>

          <Section title="Экспорт">
            <SelectField label="Формат файла" value={settings.saveFormat} options={{ doc: ".doc", docx: ".docx" }} onChange={(v) => set("saveFormat", v)} />
            <ToggleField label="Ссылки в конце предложения" value={settings.linksAtEndOfSentence} onChange={(v) => set("linksAtEndOfSentence", v)} />
            <ToggleField label="Без списка литературы" value={settings.skipBibliography} onChange={(v) => set("skipBibliography", v)} />
          </Section>

          <AiSettings settings={settings} setSettings={setSettings} />

          <button
            onClick={resetSettings}
            className="w-full rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Сбросить к стандартам ГОСТ
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm" />
    </label>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <button onClick={() => onChange(!value)} className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${value ? "translate-x-4" : ""}`} />
      </button>
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm">
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </label>
  );
}

function TextField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={hint} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
    </label>
  );
}
