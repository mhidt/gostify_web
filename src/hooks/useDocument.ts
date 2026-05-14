import { useState, useCallback, useRef } from "react";

const STORAGE_KEY = "gostify-document";

export function useDocument() {
  const [content, setContentState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setContent = useCallback((value: string) => {
    setContentState(value);
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, value);
      setSaveState("saved");
    }, 500);
  }, []);

  const replaceContent = useCallback((value: string) => {
    setContentState(value);
    localStorage.setItem(STORAGE_KEY, value);
    setSaveState("saved");
  }, []);

  return { content, setContent, replaceContent, saveState };
}
