'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconChevronRight } from '@tabler/icons-react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToolSidebarPanel } from '@/components/tools/tool-sidebar'
import { cn } from '@/lib/utils'

/**
 * Body building blocks shared by tool sidebars. Adopting them is per-tool
 * follow-up work — nothing was rewritten onto them in the branch that added
 * them, so they exist here unused until a tool migrates.
 */

/** The filter field five sidebars each rebuild. */
export function ToolSidebarSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div className={cn('relative shrink-0 px-2 py-2', className)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 pl-8 pr-8 text-sm"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer"
          onClick={() => onChange('')}
          aria-label={placeholder}
        >
          <X className="h-3 w-3" aria-hidden />
        </Button>
      )}
    </div>
  )
}

/**
 * Collapsible group following the project convention: chevron rotates 90deg
 * when open, framer-motion height/opacity at ~0.2s, nothing rendered when empty.
 */
export function ToolSidebarSection({
  title,
  count,
  defaultOpen = true,
  actions,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  if (count === 0) return null

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-1 px-2 py-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <IconChevronRight
            className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-90')}
            aria-hidden
          />
          <span className="truncate">{title}</span>
          {count !== undefined && <span className="ml-auto shrink-0 tabular-nums">{count}</span>}
        </button>
        {actions}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ToolSidebarRowProps {
  label: string
  icon?: React.ElementType
  count?: number
  active?: boolean
  /** Indent depth for tree rows. */
  level?: number
  actions?: React.ReactNode
  onSelect: () => void
}

function ToolSidebarRowImpl({
  label,
  icon: Icon,
  count,
  active,
  level = 0,
  actions,
  onSelect,
}: ToolSidebarRowProps) {
  const panel = useToolSidebarPanel()
  return (
    <div className="group/row flex items-center gap-1 px-2">
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        onClick={() => {
          onSelect()
          // On mobile the panel covers the result, so picking has to dismiss it.
          if (panel?.isOverlay) panel.close()
        }}
        style={{ paddingLeft: 8 + level * 12 }}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors',
          active
            ? 'bg-primary/10 font-medium text-foreground'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
      >
        {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">{count}</span>
        )}
      </button>
      {actions && (
        <div className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
          {actions}
        </div>
      )}
    </div>
  )
}

export const ToolSidebarRow = React.memo(ToolSidebarRowImpl, (a, b) => {
  return (
    a.label === b.label &&
    a.icon === b.icon &&
    a.count === b.count &&
    a.active === b.active &&
    a.level === b.level &&
    a.actions === b.actions &&
    a.onSelect === b.onSelect
  )
})
ToolSidebarRow.displayName = 'ToolSidebarRow'

export function ToolSidebarEmpty({
  icon: Icon,
  message,
  action,
}: {
  icon: React.ElementType
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Icon className="h-6 w-6 text-muted-foreground/40" aria-hidden />
      <p className="text-xs text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
