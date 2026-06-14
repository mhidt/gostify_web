import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { EditorAdapter } from "@/core/ai/generator";

export type SearchPanelMode = "search" | "replace";

interface EditorAdapterValue {
  editorAdapter: EditorAdapter | null;
  insertImage: ((name: string) => void) | null;
  searchOpener: ((mode: SearchPanelMode) => void) | null;
}

interface EditorRegistrationValue {
  registerEditorAdapter: (adapter: EditorAdapter | null) => void;
  registerImageInserter: (inserter: ((name: string) => void) | null) => void;
  registerSearchOpener: (opener: ((mode: SearchPanelMode) => void) | null) => void;
}

const EditorAdapterContext = createContext<EditorAdapterValue | null>(null);
const EditorRegistrationContext = createContext<EditorRegistrationValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [editorAdapter, setEditorAdapter] = useState<EditorAdapter | null>(null);
  const [insertImage, setInsertImage] = useState<((name: string) => void) | null>(null);
  const [searchOpener, setSearchOpener] = useState<((mode: SearchPanelMode) => void) | null>(null);

  const registerEditorAdapter = useCallback((adapter: EditorAdapter | null) => {
    setEditorAdapter(adapter);
  }, []);

  const registerImageInserter = useCallback((inserter: ((name: string) => void) | null) => {
    setInsertImage(() => inserter);
  }, []);

  const registerSearchOpener = useCallback((opener: ((mode: SearchPanelMode) => void) | null) => {
    setSearchOpener(() => opener);
  }, []);

  const registration: EditorRegistrationValue = {
    registerEditorAdapter,
    registerImageInserter,
    registerSearchOpener,
  };

  return (
    <EditorRegistrationContext.Provider value={registration}>
      <EditorAdapterContext.Provider value={{ editorAdapter, insertImage, searchOpener }}>
        {children}
      </EditorAdapterContext.Provider>
    </EditorRegistrationContext.Provider>
  );
}

export function useEditorAdapter() {
  const context = useContext(EditorAdapterContext);
  if (!context) throw new Error("useEditorAdapter must be used within EditorProvider");
  return context;
}

export function useEditorRegistration() {
  const context = useContext(EditorRegistrationContext);
  if (!context) throw new Error("useEditorRegistration must be used within EditorProvider");
  return context;
}
