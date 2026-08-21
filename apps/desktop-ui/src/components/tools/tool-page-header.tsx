'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ToolLauncher } from '@/components/tools/tool-launcher'

interface ToolPageHeaderProps {
  /** Accepted for call-site compatibility; the header no longer renders an icon. */
  icon?: React.ElementType
  title: string
  description: React.ReactNode
  accent?: { bg: string; text: string }
  /** Set false on tools that talk to the network (lookups, testers). */
  offline?: boolean
  className?: string
}

/**
 * Page-level header for a tool page: title + description, shown at every
 * breakpoint. `icon`/`accent` are still accepted so call sites don't churn,
 * but nothing is rendered for them.
 */
export function ToolPageHeader({
  icon: _icon,
  title,
  description,
  accent: _accent,
  className,
}: ToolPageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1
          title={title}
          className="truncate text-sm font-semibold tracking-tight"
        >
          {title}
        </h1>
        <p
          title={typeof description === 'string' ? description : undefined}
          className="line-clamp-2 text-xs text-muted-foreground md:text-sm"
        >
          {description}
        </p>
      </div>
      <ToolLauncher className="mt-0.5" />
    </div>
  )
}
