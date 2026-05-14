import { useState, useCallback, useRef } from "react";

const STORAGE_KEY = "gostify-document";
const SAVE_DELAY_MS = 10_000;
const SAVING_VISIBLE_MS = 250;

export function useDocument() {
  const [content, setContentState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [saveState, setSaveState] = useState<"saved" | "pending" | "saving">("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setContent = useCallback((value: string) => {
    setContentState(value);
    setSaveState("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSaveState("saving");
      window.setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, value);
        setSaveState("saved");
      }, SAVING_VISIBLE_MS);
    }, SAVE_DELAY_MS);
  }, []);

  const replaceContent = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setContentState(value);
    localStorage.setItem(STORAGE_KEY, value);
    setSaveState("saved");
  }, []);

  const flushSave = useCallback((value: string = content) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setSaveState("saving");
    localStorage.setItem(STORAGE_KEY, value);
    setSaveState("saved");
  }, [content]);

  return { content, setContent, replaceContent, flushSave, saveState };
}
