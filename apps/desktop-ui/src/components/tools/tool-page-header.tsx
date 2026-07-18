'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
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
  offline = true,
  className,
}: ToolPageHeaderProps) {
  const t = useTranslations('ToolPageHeader')
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-border/60',
          accent.bg,
          accent.text,
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <h1
            title={title}
            className="truncate text-lg font-bold tracking-tight md:text-xl"
          >
            {title}
          </h1>
          {offline ? (
            <span className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium leading-none text-emerald-600 sm:inline-flex dark:text-emerald-400">
              <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
              {t('offline')}
            </span>
          ) : null}
        </div>
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
