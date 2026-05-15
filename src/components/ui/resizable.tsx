import React from 'react'

/* Minimal resizable panel stubs — enough to satisfy type-checks.
   Replace with a full implementation (e.g. react-resizable-panels) when needed. */

export function ResizablePanelGroup({
  children,
  direction: _dir,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { direction?: 'horizontal' | 'vertical' }) {
  return (
    <div className={`flex flex-1 overflow-hidden ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function ResizablePanel({
  children,
  defaultSize: _ds,
  minSize: _min,
  maxSize: _max,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  defaultSize?: number
  minSize?: number
  maxSize?: number
}) {
  return (
    <div className={`flex-1 overflow-hidden ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function ResizableHandle({
  withHandle: _wh,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { withHandle?: boolean }) {
  return (
    <div
      className={`w-px bg-border shrink-0 cursor-col-resize ${className}`}
      {...rest}
    />
  )
}
