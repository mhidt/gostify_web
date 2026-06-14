import { DocxPluginSettings } from "@/core/settings";
import { Field, Toggle, CustomSelect, FORMAT_OPTS, NUM_OPTS } from "./shared";

interface ExportSectionProps {
  settings: DocxPluginSettings;
  set: <K extends keyof DocxPluginSettings>(key: K, value: DocxPluginSettings[K]) => void;
}

export function ExportSection({ settings, set }: ExportSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Формат файла"><CustomSelect value={settings.saveFormat} options={FORMAT_OPTS} onChange={v => set("saveFormat", v)} /></Field>
      </div>
      <div className="flex flex-wrap gap-4 pt-2">
        <Toggle label="Ссылки в конце предложения" value={settings.linksAtEndOfSentence} onChange={v => set("linksAtEndOfSentence", v)} />
        <Toggle label="Пропустить библиографию" value={settings.skipBibliography} onChange={v => set("skipBibliography", v)} />
      </div>
      <div className="border-t border-gray-200 pt-2" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Нумерация таблиц"><CustomSelect value={settings.tableNumbering} options={NUM_OPTS} onChange={v => set("tableNumbering", v)} /></Field>
        <Field label="Нумерация листингов"><CustomSelect value={settings.listingNumbering} options={NUM_OPTS} onChange={v => set("listingNumbering", v)} /></Field>
      </div>
    </div>
  );
}
