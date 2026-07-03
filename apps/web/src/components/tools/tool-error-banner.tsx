'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolErrorBannerProps {
  message: string
  className?: string
}

/**
 * Standard inline error banner for tool pages — the AlertCircle-plus-text
 * treatment previously duplicated (with drift) across generator layouts.
 * `role="alert"` announces the error to screen readers on render.
 */
export function ToolErrorBanner({ message, className }: ToolErrorBannerProps) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="text-sm">{message}</span>
    </div>
  )
}
