import type { AiProviderConfig, DocxPluginSettings } from "@/core/settings";

interface AiSettingsProps {
  settings: DocxPluginSettings;
  setSettings: (updater: Partial<DocxPluginSettings> | ((prev: DocxPluginSettings) => Partial<DocxPluginSettings>)) => void;
}

export function AiSettings({ settings, setSettings }: AiSettingsProps) {
  const updateProvider = (index: number, patch: Partial<AiProviderConfig>) => {
    setSettings((prev) => ({
      aiProviders: prev.aiProviders.map((provider, providerIndex) =>
        providerIndex === index ? { ...provider, ...patch } : provider,
      ),
    }));
  };

  const removeProvider = (index: number) => {
    setSettings((prev) => {
      const aiProviders = prev.aiProviders.filter((_, providerIndex) => providerIndex !== index);
      return {
        aiProviders,
        aiActiveProvider: Math.min(prev.aiActiveProvider, Math.max(0, aiProviders.length - 1)),
      };
    });
  };

  const addProvider = () => {
    setSettings((prev) => ({
      aiProviders: [...prev.aiProviders, { name: "", url: "", apiKey: "", model: "" }],
      aiActiveProvider: prev.aiProviders.length,
    }));
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700">ИИ генерация</h3>
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="text-gray-600">Промт полной генерации</span>
          <textarea
            value={settings.aiSystemPromptFull}
            onChange={(event) => setSettings({ aiSystemPromptFull: event.target.value })}
            rows={4}
            placeholder="Оставьте пустым для промта по умолчанию"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-gray-600">Промт генерации фрагмента</span>
          <textarea
            value={settings.aiSystemPromptPartial}
            onChange={(event) => setSettings({ aiSystemPromptPartial: event.target.value })}
            rows={4}
            placeholder="Оставьте пустым для промта по умолчанию"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>

        <label className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Активный провайдер</span>
          <select
            value={String(settings.aiActiveProvider)}
            onChange={(event) => setSettings({ aiActiveProvider: Number(event.target.value) })}
            className="max-w-44 rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {settings.aiProviders.map((provider, index) => (
              <option key={`${provider.name}-${index}`} value={index}>
                {provider.name || `Провайдер ${index + 1}`}
              </option>
            ))}
          </select>
        </label>

        {settings.aiProviders.map((provider, index) => (
          <div key={index} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-700">{provider.name || `Провайдер ${index + 1}`}</p>
            <ProviderField label="Название" value={provider.name} onChange={(value) => updateProvider(index, { name: value })} />
            <ProviderField label="URL API" value={provider.url} onChange={(value) => updateProvider(index, { url: value })} />
            <ProviderField label="API ключ" value={provider.apiKey} type="password" onChange={(value) => updateProvider(index, { apiKey: value })} />
            <ProviderField label="Модель" value={provider.model} onChange={(value) => updateProvider(index, { model: value })} />
            <button
              type="button"
              onClick={() => removeProvider(index)}
              className="w-full rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Удалить провайдер
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addProvider}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Добавить провайдер
        </button>
      </div>
    </div>
  );
}

function ProviderField({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: "text" | "password";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
    </label>
  );
}
