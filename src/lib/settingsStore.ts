import { DocxPluginSettings, DEFAULT_SETTINGS } from "@/core/settings";

const STORAGE_KEY = "gostify-settings";

export function loadSettings(): DocxPluginSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const stored = JSON.parse(raw) as Partial<DocxPluginSettings> & { imageCaptionSeparator?: string };
    const { imageCaptionSeparator, ...currentSettings } = stored;
    const captionSeparator = currentSettings.captionSeparator ?? imageCaptionSeparator;
    return { ...DEFAULT_SETTINGS, ...currentSettings, ...(captionSeparator ? { captionSeparator } : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: DocxPluginSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
