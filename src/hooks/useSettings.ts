import { useState, useCallback } from "react";
import { DocxPluginSettings, DEFAULT_SETTINGS } from "@/core/settings";
import { loadSettings, saveSettings } from "@/lib/settingsStore";

export function useSettings() {
  const [settings, setSettingsState] = useState<DocxPluginSettings>(loadSettings);

  const setSettings = useCallback((updater: Partial<DocxPluginSettings> | ((prev: DocxPluginSettings) => Partial<DocxPluginSettings>)) => {
    setSettingsState((prev) => {
      const partial = typeof updater === "function" ? updater(prev) : updater;
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = { ...DEFAULT_SETTINGS };
    saveSettings(defaults);
    setSettingsState(defaults);
  }, []);

  return { settings, setSettings, resetSettings };
}
