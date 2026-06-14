import { useState, useRef, useEffect } from "react";
import { Eye, ChevronDown } from "lucide-react";

export const inputCls = "w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all";

export function CustomSelect({ value, options, onChange }: { value: string; options: Record<string, string>; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label = options[value] ?? value;

  return (
    <div ref={ref} className="relative select-none">
      <div
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between h-9 px-3 rounded-lg border text-sm cursor-pointer transition-all ${open ? "border-blue-500 bg-white ring-1 ring-blue-500 text-gray-800" : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300 hover:bg-white"}`}
      >
        <span>{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="cs-dropdown absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {Object.entries(options).map(([k, v]) => (
            <div
              key={k}
              onClick={() => { onChange(k); setOpen(false); }}
              className={`cs-option px-3 py-2 text-sm cursor-pointer transition-colors ${k === value ? "bg-blue-50 text-blue-600 font-medium selected" : "text-gray-700 hover:bg-blue-50"}`}
            >
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const ALIGN_OPTS = { center: "По центру", left: "По левому краю", justified: "По ширине" };
export const SPACING_OPTS: Record<string, string> = { "1": "Одинарный", "1.5": "Полуторный", "2": "Двойной" };
export const NUM_OPTS = { sequential: "Сквозная", byChapter: "По разделам" };
export const SEP_OPTS = { dot: ". (точка)", dash: "– (тире)" };
export const FORMAT_OPTS = { doc: ".doc", docx: ".docx" };
export const SIZE_OPTS = { "12": "12", "14": "14", "16": "16", "18": "18" };

export function Icon({ bg, text, children }: { bg: string; text: string; children: React.ReactNode }) {
  return <div className={`w-5 h-5 rounded ${bg} flex items-center justify-center ${text}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[11px] font-medium text-gray-500 mb-1.5 block">{label}</label>{children}</div>;
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none w-fit">
      <button onClick={() => onChange(!value)} className={`relative h-5 w-9 rounded-full transition-colors shrink-0 cursor-pointer ${value ? "bg-blue-600 toggle-track-on" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full toggle-knob transition-transform ${value ? "translate-x-4" : ""}`} />
      </button>
      {label}
    </label>
  );
}

export function MarginField({ label, value, onChange, w }: { label: string; value: number; onChange: (v: number) => void; w: string }) {
  return (
    <div className={`${w} flex flex-col items-center`}>
      <label className="text-[11px] font-medium text-gray-500 mb-1.5 block text-center w-full">{label}</label>
      <input type="number" value={value} min={0} step={5} onChange={e => onChange(Number(e.target.value))} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-center bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all" />
    </div>
  );
}

export function PreviewHeader() {
  return (
    <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2">
      <Eye className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Предпросмотр</span>
    </div>
  );
}
