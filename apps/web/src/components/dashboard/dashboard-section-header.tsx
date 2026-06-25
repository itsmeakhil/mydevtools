'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { DEFAULT_ACCENT } from './types'

interface DashboardSectionHeaderProps {
  icon: React.ElementType
  title: string
  /** Optional count pill (e.g. number of tools in the section). */
  count?: number
  /** Per-category accent classes for the icon chip; defaults to primary. */
  accent?: { bg: string; text: string }
  /** Optional trailing action rendered on the right (e.g. a link/button). */
  action?: React.ReactNode
  className?: string
}

/**
 * Shared dashboard section header — an accented icon chip, title, optional
 * count pill, and an optional trailing action, finished with a faded gradient
 * hairline. Used across every dashboard section for consistent hierarchy.
 */
export function DashboardSectionHeader({
  icon: Icon,
  title,
  count,
  accent = DEFAULT_ACCENT,
  action,
  className,
}: DashboardSectionHeaderProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-border/60',
              accent.bg,
              accent.text,
            )}
          >
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <h2 className="truncate text-lg font-semibold tracking-tight md:text-xl">{title}</h2>
          {typeof count === 'number' && (
            <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="h-px w-full bg-gradient-to-r from-border via-border/40 to-transparent" />
    </div>
  )
}
