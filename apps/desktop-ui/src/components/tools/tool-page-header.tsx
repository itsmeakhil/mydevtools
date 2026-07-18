'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'

interface ToolPageHeaderProps {
  icon: React.ElementType
  title: string
  description: React.ReactNode
  accent?: { bg: string; text: string }
  /** Set false on tools that talk to the network (lookups, testers). */
  offline?: boolean
  className?: string
}

/**
 * Page-level header for a tool page: accented icon chip + title + description,
 * shown at every breakpoint. Mirrors DashboardSectionHeader's icon-chip
 * hierarchy so a tool page reads as part of the same product as the dashboard.
 */
export function ToolPageHeader({
  icon: Icon,
  title,
  description,
  accent = CATEGORY_ACCENT.Formatters,
  className,
}: ToolPageHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span
        className={cn(
          'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-border/60',
          accent.bg,
          accent.text,
        )}
      >
        <Icon className="h-[22px] w-[22px]" aria-hidden />
      </span>
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
    </div>
  )
}
