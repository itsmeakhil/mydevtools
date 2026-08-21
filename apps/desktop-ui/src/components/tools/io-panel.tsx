'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Responsive container for a tool's IO panels — one column on mobile, two on
 * desktop. The shared shape behind every formatter/converter/generator that
 * shows input → output side by side.
 */
export function ToolPanels({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface IOPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Panel label shown in the header (left). */
  label: React.ReactNode
  /** Header controls (copy, clear, format, counts…), right-aligned. */
  actions?: React.ReactNode
  children: React.ReactNode
  /** Applied to the body region that holds the field/editor. */
  bodyClassName?: string
}

/**
 * A labelled input/output panel — the one shared shape for IO tools. Matches
 * the json-formatter surface exactly: bg-card panel, hairline border, a
 * surface-2 header carrying the label and an actions slot. Drop a
 * <ToolTextArea> or the shared <CodeEditor> into the body.
 */
export function IOPanel({
  label,
  actions,
  children,
  className,
  bodyClassName,
  ...rest
}: IOPanelProps) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card',
        className,
      )}
      {...rest}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-[hsl(var(--surface-2))] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          {label}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        ) : null}
      </div>
      <div className={cn('relative min-h-0 flex-1', bodyClassName)}>
        {children}
      </div>
    </div>
  )
}

type ToolTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

/**
 * The standard fill-the-panel monospace field, replacing the hand-styled raw
 * textareas scattered across tools. Transparent, so it sits directly on the
 * panel's bg-card surface. Absolutely positioned to fill an IOPanel body.
 */
export const ToolTextArea = React.forwardRef<
  HTMLTextAreaElement,
  ToolTextAreaProps
>(function ToolTextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      spellCheck={false}
      className={cn(
        'absolute inset-0 h-full w-full resize-none bg-transparent p-3 text-sm font-mono leading-relaxed outline-none placeholder:text-muted-foreground/50',
        className,
      )}
      {...props}
    />
  )
})
