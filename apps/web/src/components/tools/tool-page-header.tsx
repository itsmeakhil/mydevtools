'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'

interface ToolPageHeaderProps {
  icon: React.ElementType
  title: string
  description: string
  accent?: { bg: string; text: string }
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
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-border/60',
          accent.bg,
          accent.text,
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight md:text-xl">{title}</h1>
        <p className="truncate text-xs text-muted-foreground md:text-sm">{description}</p>
      </div>
    </div>
  )
}
