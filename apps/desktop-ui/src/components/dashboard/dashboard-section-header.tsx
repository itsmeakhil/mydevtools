'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface DashboardSectionHeaderProps {
  icon: React.ElementType
  title: string
  /** Optional muted count (e.g. number of tools in the section). */
  count?: number
  /** Deprecated — ignored; kept so existing call sites compile. */
  accent?: { bg: string; text: string }
  /** Optional trailing action rendered on the right (e.g. a link/button). */
  action?: React.ReactNode
  className?: string
}

/**
 * Shared dashboard section header — a quiet icon, title, muted count and an
 * optional trailing action. Used across every dashboard section for consistent
 * hierarchy. `accent` is accepted for compatibility but no longer rendered —
 * section icons are neutral per DESIGN.md.
 */
export function DashboardSectionHeader({
  icon: Icon,
  title,
  count,
  action,
  className,
}: DashboardSectionHeaderProps) {
  return (
    <div className={cn('flex min-h-7 items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon size={15} strokeWidth={1.75} className="shrink-0 text-muted-foreground" />
        <h2 className="truncate text-[13px] font-semibold text-foreground">{title}</h2>
        {typeof count === 'number' && (
          <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{count}</span>
        )}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
