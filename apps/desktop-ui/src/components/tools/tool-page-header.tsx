'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ToolPageHeaderProps {
  icon?: React.ElementType
  title: string
  /** Shown as the title's tooltip. */
  description: React.ReactNode
  /** Kept for call sites; no longer rendered. */
  accent?: { bg: string; text: string }
  /** Kept for call sites; no longer rendered. */
  offline?: boolean
  className?: string
}

/**
 * Compact tool title — same icon + 13px semibold label as the Notes /
 * Password Manager sidebar header (ToolSidebarLayout).
 */
export function ToolPageHeader({ icon: Icon, title, description, className }: ToolPageHeaderProps) {
  return (
    <div className={cn('flex h-9 shrink-0 items-center gap-2 px-1 text-[13px] font-semibold', className)}>
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
      <h1 title={typeof description === 'string' ? description : title} className="truncate">
        {title}
      </h1>
    </div>
  )
}
