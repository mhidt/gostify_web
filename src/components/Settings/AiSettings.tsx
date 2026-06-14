import { useState, useRef, useCallback } from "react";
import { WandSparkles, Plus, Trash2, ChevronDown, Zap, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { AiProviderConfig, DocxPluginSettings } from "@/core/settings";
import { inputCls } from "./shared";

interface AiSettingsProps {
  settings: DocxPluginSettings;
  setSettings: (updater: Partial<DocxPluginSettings> | ((prev: DocxPluginSettings) => Partial<DocxPluginSettings>)) => void;
}

const textareaCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none";

type TestState = "idle" | "loading" | "ok" | "error";

function PromptSection({ icon, title, value, onChange }: { icon: React.ReactNode; title: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">{icon}</div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder="Оставьте пустым для промта по умолчанию" className={textareaCls} />
    </div>
  );
}

function ProviderCard({ provider, index, isActive, startOpen, onUpdate, onRemove, onActivate }: {
  provider: AiProviderConfig;
  index: number;
  isActive: boolean;
  startOpen?: boolean;
  onUpdate: (i: number, patch: Partial<AiProviderConfig>) => void;
  onRemove: (i: number) => void;
  onActivate: (i: number) => void;
}) {
  const [open, setOpen] = useState(!!startOpen);
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMsg, setTestMsg] = useState("");

  const test = useCallback(async () => {
    if (!provider.url || !provider.apiKey || !provider.model) {
      setTestState("error");
      setTestMsg("Заполните URL, ключ и модель");
      return;
    }
    setTestState("loading");
    setTestMsg("");
    try {
      const proxyUrl = import.meta.env.DEV
        ? `/api/ai-proxy?url=${encodeURIComponent(provider.url)}`
        : provider.url;
      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify({ model: provider.model, messages: [{ role: "user", content: "Hi" }], max_tokens: 1, stream: false }),
      });
      if (res.ok) {
        setTestState("ok");
        setTestMsg("Подключение успешно");
      } else {
        let msg = `${res.status}`;
        try {
          const data = await res.json();
          msg += `: ${data?.error?.message || data?.message || data?.msg || JSON.stringify(data).slice(0, 100)}`;
        } catch { msg += `: ${await res.text().catch(() => "Неизвестная ошибка")}`.slice(0, 100); }
        setTestState("error");
        setTestMsg(msg);
      }
    } catch (e) {
      setTestState("error");
      setTestMsg(e instanceof Error ? e.message : "Ошибка сети");
    }
  }, [provider.url, provider.apiKey, provider.model]);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      <div
        onClick={() => { setOpen(o => !o); if (!isActive) onActivate(index); }}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-blue-500" : "bg-gray-300"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{provider.name || `Провайдер ${index + 1}`}</p>
          {provider.model && <p className="text-[11px] text-gray-400 truncate">{provider.model}</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <ProviderField label="Название" value={provider.name} onChange={v => onUpdate(index, { name: v })} />
            <ProviderField label="URL API" value={provider.url} onChange={v => onUpdate(index, { url: v })} />
            <ProviderField label="API ключ" value={provider.apiKey} type="password" onChange={v => onUpdate(index, { apiKey: v })} />
            <ProviderField label="Модель" value={provider.model} onChange={v => onUpdate(index, { model: v })} />
          </div>
          {testMsg && (
            <p className={`text-[11px] mt-2 ${testState === "ok" ? "text-emerald-600" : "text-red-500"}`}>{testMsg}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <button onClick={test} disabled={testState === "loading"} className="h-7 px-3 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              {testState === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : testState === "ok" ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : testState === "error" ? <XCircle className="w-3 h-3 text-red-400" /> : <Zap className="w-3 h-3" />}
              Тест
            </button>
            <button onClick={() => onRemove(index)} className="h-7 px-3 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer">
              <Trash2 className="w-3 h-3" />Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AiSettings({ settings, setSettings }: AiSettingsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateProvider = (index: number, patch: Partial<AiProviderConfig>) => {
    setSettings((prev) => ({
      aiProviders: prev.aiProviders.map((p, i) => i === index ? { ...p, ...patch } : p),
    }));
  };

  const removeProvider = (index: number) => {
    setSettings((prev) => {
      const aiProviders = prev.aiProviders.filter((_, i) => i !== index);
      return {
        aiProviders,
        aiActiveProvider: Math.min(prev.aiActiveProvider, Math.max(0, aiProviders.length - 1)),
      };
    });
  };

  const activateProvider = (index: number) => {
    setSettings({ aiActiveProvider: index });
  };

  const addProvider = () => {
    setSettings((prev) => ({
      aiProviders: [...prev.aiProviders, { name: "", url: "", apiKey: "", model: "" }],
      aiActiveProvider: prev.aiProviders.length,
    }));
    requestAnimationFrame(() => {
      const scroller = scrollRef.current?.closest('.overflow-y-auto');
      if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    });
  };

  return (
    <div className="space-y-5" ref={scrollRef}>
      <PromptSection
        icon={<WandSparkles className="w-4 h-4" />}
        title="Полная генерация"
        value={settings.aiSystemPromptFull}
        onChange={v => setSettings({ aiSystemPromptFull: v })}
      />
      <PromptSection
        icon={<WandSparkles className="w-4 h-4" />}
        title="Частичная генерация"
        value={settings.aiSystemPromptPartial}
        onChange={v => setSettings({ aiSystemPromptPartial: v })}
      />

      {settings.aiProviders.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Провайдеры</p>
          {settings.aiProviders.map((provider, index) => (
            <ProviderCard
              key={index}
              provider={provider}
              index={index}
              isActive={settings.aiActiveProvider === index}
              startOpen={index === settings.aiProviders.length - 1 && !provider.name}
              onUpdate={updateProvider}
              onRemove={removeProvider}
              onActivate={activateProvider}
            />
          ))}
        </div>
      )}

      <button onClick={addProvider} className="w-full h-9 rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 cursor-pointer">
        <Plus className="w-4 h-4" />Добавить провайдер
      </button>
    </div>
  );
}

function ProviderField({ label, value, type = "text", onChange }: { label: string; value: string; type?: "text" | "password"; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-gray-500 mb-1 block">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}
