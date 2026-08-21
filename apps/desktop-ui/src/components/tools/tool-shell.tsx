'use client'

import * as React from 'react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { cn } from '@/lib/utils'

interface ToolShellProps {
  /** Accepted for call-site parity with ToolPageHeader; not rendered today. */
  icon?: React.ElementType
  title: string
  description: React.ReactNode
  /** Set false on tools that hit the network (lookups, testers). */
  offline?: boolean
  /** Row between the header and the content: mode switches, primary actions. */
  toolbar?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

/**
 * The standard outer frame for a single-page tool. Paints the shared grid
 * surface, the identity header, an optional toolbar row, then a flex-1 content
 * region — the same skeleton json-formatter/regex-tester use, so every tool
 * opens into the same rhythm instead of its own hand-rolled layout.
 *
 * Horizontal breathing room comes from the tool's page.tsx wrapper
 * (`p-2 md:p-4`), matching every existing tool — the shell adds none itself.
 */
export function ToolShell({
  icon,
  title,
  description,
  offline,
  toolbar,
  children,
  className,
  contentClassName,
}: ToolShellProps) {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg',
        className,
      )}
    >
      <div className="dash-ambient -z-10" aria-hidden />
      <ToolPageHeader
        icon={icon}
        title={title}
        description={description}
        offline={offline}
      />
      {toolbar}
      <div className={cn('flex min-h-0 flex-1 flex-col', contentClassName)}>
        {children}
      </div>
    </div>
  )
}
