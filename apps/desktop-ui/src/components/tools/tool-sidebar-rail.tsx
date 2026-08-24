'use client'

import * as React from 'react'
import { MoreHorizontal, PanelLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  RAIL_MAX_VISIBLE,
  splitRailEntries,
  type ToolSidebarRailEntry,
} from '@/lib/tool-sidebar-rail'
import { cn } from '@/lib/utils'

/**
 * The collapsed sidebar: a 48px column that keeps the tool's identity, its
 * primary action and its facets reachable without expanding. Buttons are 40x40
 * inside 4px gutters, which clears the 44px pointer target.
 *
 * The rail owns no state. Entries arrive already flattened, and every click is
 * routed back through `onActivate` so the layout can expand the panel first.
 */

interface Accent {
  bg: string
  text: string
}

interface RailButtonProps {
  entry: ToolSidebarRailEntry
  accent: Accent
  onActivate: (entry: ToolSidebarRailEntry) => void
}

function RailButtonImpl({ entry, accent, onActivate }: RailButtonProps) {
  const Icon = entry.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          data-rail-entry={entry.id}
          aria-label={entry.label}
          aria-current={entry.active ? 'true' : undefined}
          onClick={() => onActivate(entry)}
          className={cn(
            'relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors',
            entry.active
              ? cn(accent.bg, accent.text)
              : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
          )}
        >
          {entry.active && (
            <span aria-hidden className="absolute -left-1 h-5 w-0.5 rounded-full bg-current" />
          )}
          {Icon ? (
            <Icon className="h-[17px] w-[17px]" aria-hidden />
          ) : (
            <span aria-hidden className="text-xs font-semibold uppercase">
              {entry.label.slice(0, 2)}
            </span>
          )}
          {entry.count !== undefined && entry.count > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 min-w-3.5 rounded-full bg-foreground/10 px-1 text-[9px] font-medium leading-[14px] tabular-nums text-foreground/70"
            >
              {entry.count > 99 ? '99+' : entry.count}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {entry.count !== undefined ? `${entry.label} (${entry.count})` : entry.label}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Memoized on displayed data only. `onActivate` is compared by identity but the
 * layout passes a `useCallback`-stable handler, and entry handlers are resolved
 * through a ref at click time, so a changing closure never forces a re-render.
 */
export const RailButton = React.memo(RailButtonImpl, (a, b) => {
  return (
    a.entry.id === b.entry.id &&
    a.entry.label === b.entry.label &&
    a.entry.count === b.entry.count &&
    a.entry.active === b.entry.active &&
    a.entry.icon === b.entry.icon &&
    a.entry.groupStart === b.entry.groupStart &&
    a.accent.bg === b.accent.bg &&
    a.accent.text === b.accent.text
  )
})
RailButton.displayName = 'RailButton'

export interface ToolSidebarRailProps {
  /** Tool identity chip at the top. Clicking it expands the panel. */
  icon: React.ElementType
  title: string
  accent: Accent
  entries: ToolSidebarRailEntry[]
  primaryAction?: { icon: React.ElementType; label: string; onClick: () => void }
  /** Expand the panel (rail bottom button, tool chip, and before any entry). */
  onExpand: () => void
  onActivate: (entry: ToolSidebarRailEntry) => void
  /** Wired by the layout so `aria-controls` points at the panel. */
  panelId: string
  /** So the layout can return focus here when the panel collapses. */
  expandRef?: React.RefObject<HTMLButtonElement | null>
}

export function ToolSidebarRail({
  icon: Icon,
  title,
  accent,
  entries,
  primaryAction,
  onExpand,
  onActivate,
  panelId,
  expandRef,
}: ToolSidebarRailProps) {
  const t = useTranslations('ToolSidebar')
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const { visible, overflow } = splitRailEntries(entries, RAIL_MAX_VISIBLE)

  // Roving tabindex: the container is the single tab stop, arrows move focus
  // between buttons. Without this a tool with eight facets adds eight stops to
  // every Tab sweep of the app.
  const focusAt = React.useCallback((delta: number | 'first' | 'last') => {
    const nodes = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-rail-entry]') ?? [],
    )
    if (!nodes.length) return
    const current = nodes.findIndex((n) => n === document.activeElement)
    let next: number
    if (delta === 'first') next = 0
    else if (delta === 'last') next = nodes.length - 1
    else next = current === -1 ? 0 : (current + delta + nodes.length) % nodes.length
    nodes[next]?.focus()
  }, [])

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusAt(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        focusAt(-1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        focusAt('first')
      } else if (e.key === 'End') {
        e.preventDefault()
        focusAt('last')
      }
    },
    [focusAt],
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-muted/10 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onExpand}
              aria-label={`${title} — ${t('expand')}`}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-foreground/[0.06]"
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md',
                  accent.bg,
                  accent.text,
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {title}
          </TooltipContent>
        </Tooltip>

        {primaryAction && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 cursor-pointer"
                onClick={primaryAction.onClick}
                aria-label={primaryAction.label}
              >
                <primaryAction.icon className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {primaryAction.label}
            </TooltipContent>
          </Tooltip>
        )}

        {(visible.length > 0 || overflow.length > 0) && (
          <div className="my-1 h-px w-6 shrink-0 bg-border" aria-hidden />
        )}

        <div
          ref={listRef}
          role="toolbar"
          aria-orientation="vertical"
          aria-label={t('sections')}
          tabIndex={visible.length ? 0 : -1}
          onKeyDown={onKeyDown}
          className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-hidden"
        >
          {visible.map((entry) => (
            <React.Fragment key={entry.id}>
              {entry.groupStart && (
                <div className="my-1 h-px w-6 shrink-0 bg-border" aria-hidden />
              )}
              <RailButton entry={entry} accent={accent} onActivate={onActivate} />
            </React.Fragment>
          ))}

          {overflow.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 cursor-pointer"
                  aria-label={t('moreSections')}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                {overflow.map((entry) => (
                  <DropdownMenuItem key={entry.id} onSelect={() => onActivate(entry)}>
                    {entry.icon && <entry.icon className="mr-2 h-4 w-4" aria-hidden />}
                    <span className="flex-1">{entry.label}</span>
                    {entry.count !== undefined && (
                      <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                        {entry.count}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={expandRef}
              variant="ghost"
              size="icon"
              className="mt-auto h-10 w-10 cursor-pointer"
              onClick={onExpand}
              aria-label={t('expand')}
              aria-expanded={false}
              aria-controls={panelId}
            >
              <PanelLeft className="h-4 w-4" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {t('expand')}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
