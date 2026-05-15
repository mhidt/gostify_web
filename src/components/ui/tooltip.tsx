import React from 'react'

/* Minimal Tooltip stubs.
   Replace with @radix-ui/react-tooltip (or shadcn/ui) for production use. */

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipTrigger({
  children,
  asChild: _ac,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) {
  return <div {...rest}>{children}</div>
}

export function TooltipContent({
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest}>{children}</div>
}
