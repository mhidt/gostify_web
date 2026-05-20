import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { FileText, WandSparkles } from "lucide-react";

interface Position {
  x: number;
  y: number;
}

interface Props {
  position: Position;
  canGenerate: boolean;
  isRunning: boolean;
  onClose: () => void;
  onGenerateWork: () => void;
  onGenerateFragment: () => void;
}

const MENU_WIDTH = 236;
const MENU_HEIGHT = 92;
const MARGIN = 8;

export default function AiContextMenu({
  position,
  canGenerate,
  isRunning,
  onClose,
  onGenerateWork,
  onGenerateFragment,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  const style = useMemo<CSSProperties>(() => {
    const maxX = window.innerWidth - MENU_WIDTH - MARGIN;
    const maxY = window.innerHeight - MENU_HEIGHT - MARGIN;

    return {
      position: "fixed",
      left: Math.max(MARGIN, Math.min(position.x, maxX)),
      top: Math.max(MARGIN, Math.min(position.y, maxY)),
      zIndex: 9999,
    };
  }, [position.x, position.y]);

  const disabled = !canGenerate || isRunning;

  return (
    <div ref={menuRef} style={style} className="min-w-[236px] rounded-md border border-gray-200 bg-white py-1 shadow-xl">
      <button
        disabled={disabled}
        onClick={() => {
          onGenerateWork();
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        Сгенерировать работу
      </button>
      <button
        disabled={disabled}
        onClick={() => {
          onGenerateFragment();
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
      >
        <WandSparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
        Сгенерировать фрагмент
      </button>
    </div>
  );
}
