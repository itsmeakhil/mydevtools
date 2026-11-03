import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * macOS System-Settings-style group: a muted section title above a solid
 * rounded card whose children are hairline-divided rows, with an optional
 * footnote below.
 */
export function SettingsGroup({
  title,
  footer,
  className,
  children,
}: {
  title?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      {title ? (
        <h3 className="px-1 text-[13px] font-semibold text-muted-foreground">{title}</h3>
      ) : null}
      <div
        className={cn(
          'glass-card divide-y divide-border rounded-xl text-card-foreground',
          className,
        )}
      >
        {children}
      </div>
      {footer ? <p className="px-1 text-xs text-muted-foreground">{footer}</p> : null}
    </section>
  )
}

/** One row in a SettingsGroup: label (+ help text) left, control right. */
export function SettingsRow({
  label,
  description,
  className,
  children,
}: {
  label: React.ReactNode
  description?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex min-h-12 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  )
}
