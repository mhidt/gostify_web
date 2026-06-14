import { DocxPluginSettings } from "@/core/settings";
import { Field, Toggle, PreviewHeader, CustomSelect, SIZE_OPTS, ALIGN_OPTS, SPACING_OPTS, inputCls } from "./shared";

interface FontSectionProps {
  settings: DocxPluginSettings;
  set: <K extends keyof DocxPluginSettings>(key: K, value: DocxPluginSettings[K]) => void;
  headingTab: "chapters" | "paragraphs";
  setHeadingTab: (tab: "chapters" | "paragraphs") => void;
}

export function FontSection({ settings, set, headingTab, setHeadingTab }: FontSectionProps) {
  const previewChapterText =
    (settings.chapterPrefix ? "Глава " : "") + "1" + (settings.chapterDot ? "." : "") + " Теоретические основы";
  const previewParagraphText = "1.1" + (settings.paragraphDot ? "." : "") + " Анализ предметной области";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Field label="Размер шрифта, pt"><input type="number" value={settings.fontSize} onChange={e => set("fontSize", Number(e.target.value))} className={inputCls} /></Field>
        <Field label="Межстрочный интервал"><CustomSelect value={String(settings.lineSpacing)} options={SPACING_OPTS} onChange={v => set("lineSpacing", Number(v))} /></Field>
        <Field label="Отступ первой строки, см"><input type="number" value={settings.firstLineIndent} step={0.25} onChange={e => set("firstLineIndent", Number(e.target.value))} className={inputCls} /></Field>
      </div>
      <div className="border-t border-gray-200 pt-2" />
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button onClick={() => setHeadingTab("chapters")} className={`flex-1 h-7 rounded-md text-xs font-medium transition-all border ${headingTab === "chapters" ? "bg-blue-50 text-blue-600 font-semibold border-blue-600" : "text-gray-600 border-transparent"}`}>Главы (#)</button>
        <button onClick={() => setHeadingTab("paragraphs")} className={`flex-1 h-7 rounded-md text-xs font-medium transition-all border ${headingTab === "paragraphs" ? "bg-blue-50 text-blue-600 font-semibold border-blue-600" : "text-gray-600 border-transparent"}`}>Параграфы (##)</button>
      </div>
      {headingTab === "chapters" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Размер"><CustomSelect value={String(settings.chapterFontSize)} options={SIZE_OPTS} onChange={v => set("chapterFontSize", Number(v))} /></Field>
            <Field label="Выравнивание"><CustomSelect value={settings.chapterAlignment} options={ALIGN_OPTS} onChange={v => set("chapterAlignment", v)} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle label="Жирный" value={settings.chapterBold} onChange={v => set("chapterBold", v)} />
            <Toggle label='Префикс «Глава»' value={settings.chapterPrefix} onChange={v => set("chapterPrefix", v)} />
            <Toggle label="Точка после номера" value={settings.chapterDot} onChange={v => set("chapterDot", v)} />
            <Toggle label="Все заглавные" value={settings.chapterAllCaps} onChange={v => set("chapterAllCaps", v)} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Размер"><CustomSelect value={String(settings.paragraphFontSize)} options={SIZE_OPTS} onChange={v => set("paragraphFontSize", Number(v))} /></Field>
            <Field label="Выравнивание"><CustomSelect value={settings.paragraphAlignment} options={ALIGN_OPTS} onChange={v => set("paragraphAlignment", v)} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle label="Жирный" value={settings.paragraphBold} onChange={v => set("paragraphBold", v)} />
            <Toggle label="Точка после номера" value={settings.paragraphDot} onChange={v => set("paragraphDot", v)} />
            <Toggle label="Отступ абзаца" value={settings.paragraphIndent} onChange={v => set("paragraphIndent", v)} />
          </div>
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
        <PreviewHeader />
        <div className="px-6 py-4">
          <div className="transition-all" style={{ fontSize: settings.chapterFontSize, fontWeight: settings.chapterBold ? 700 : 400, textAlign: settings.chapterAlignment === "left" ? "left" : settings.chapterAlignment === "justified" ? "justify" : "center" }}>
            {settings.chapterAllCaps ? previewChapterText.toUpperCase() : previewChapterText}
          </div>
          <div className="transition-all" style={{ fontSize: settings.paragraphFontSize, fontWeight: settings.paragraphBold ? 700 : 400, textAlign: settings.paragraphAlignment === "left" ? "left" : settings.paragraphAlignment === "justified" ? "justify" : "center", textIndent: settings.paragraphIndent ? `${settings.firstLineIndent}cm` : 0 }}>
            {previewParagraphText}
          </div>
          <p className="text-gray-400 transition-all mt-2" style={{ fontSize: settings.fontSize, lineHeight: settings.lineSpacing, textIndent: `${settings.firstLineIndent}cm` }}>
            Текст параграфа, следующий за заголовком, отображается стандартным шрифтом...
          </p>
        </div>
      </div>
    </div>
  );
}
