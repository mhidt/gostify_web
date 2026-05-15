import { useEffect, useRef } from 'react'

export interface ContextMenuState {
  x: number
  y: number
  nodeType: 'heading' | 'paragraph'
  nodeText: string
}

interface EditorContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
  onGenerate: (type: 'work' | 'fragment', nodeText: string) => void
}

export default function EditorContextMenu({ menu, onClose, onGenerate }: EditorContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escHandler)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[200px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ left: menu.x, top: menu.y }}
    >
      {menu.nodeType === 'heading' ? (
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => {
            onGenerate('work', menu.nodeText)
            onClose()
          }}
        >
          <span className="text-base leading-none">□</span>
          Сгенерировать работу
        </button>
      ) : (
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => {
            onGenerate('fragment', menu.nodeText)
            onClose()
          }}
        >
          <span className="text-base leading-none">✎</span>
          Сгенерировать фрагмент
        </button>
      )}
    </div>
  )
}
