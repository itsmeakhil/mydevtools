'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ToolLauncher } from '@/components/tools/tool-launcher'

interface ToolPageHeaderProps {
  /** Shown in the accent-tinted icon well. */
  icon?: React.ElementType
  title: string
  description: React.ReactNode
  accent?: { bg: string; text: string }
  /** Set false on tools that talk to the network (lookups, testers). */
  offline?: boolean
  className?: string
}

/**
 * Page-level tool header — a Liquid Glass bar inset from the pane edges, with
 * an accent-tinted icon well (user accent, not a category hue). Sticks to the
 * top when its parent scrolls. `accent` is still accepted for call sites.
 */
export function ToolPageHeader({
  icon: Icon,
  title,
  description,
  accent: _accent,
  className,
}: ToolPageHeaderProps) {
  return (
    <div
      className={cn(
        'liquid sticky top-3 z-10 mx-3 mt-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.16] text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]">
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 title={title} className="truncate text-lg font-semibold tracking-[-0.01em]">
            {title}
          </h1>
          <p
            title={typeof description === 'string' ? description : undefined}
            className="line-clamp-1 text-[13px] font-medium text-muted-foreground"
          >
            {description}
          </p>
        </div>
      </div>
      <ToolLauncher />
    </div>
  )
}
