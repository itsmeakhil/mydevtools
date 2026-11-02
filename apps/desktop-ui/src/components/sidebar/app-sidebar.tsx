'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import {
  IconChevronLeft,
  IconChevronRight,
  IconLayoutDashboard,
  IconPin,
  IconPinnedFilled,
  IconPinnedOff,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AccountMenu } from '@/components/shell/account-menu'
import { useAppSidebarStore } from '@/store/app-sidebar-store'
import { usePinnedToolsForActiveWorkspace, usePinnedToolsStore } from '@/store/pinned-tools-store'
import { useActiveWorkspace, useWorkspaceStore } from '@/store/workspace-store'
import { getToolMessageKey } from '@/lib/tool-i18n'
import { buildCategoryGroups, buildPinnedNavItems } from './app-sidebar.helpers'
import type { NavLink } from './types'

const CATEGORY_GROUPS = buildCategoryGroups()

const isActivePath = (pathname: string, url: string) =>
  pathname === url || pathname.startsWith(url + '/')

const SidebarRow = React.memo(function SidebarRow({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  pinned,
  pinLabel,
  onTogglePin,
}: {
  href: string
  label: string
  icon?: React.ElementType
  active: boolean
  collapsed: boolean
  pinned?: boolean
  pinLabel?: string
  onTogglePin?: (href: string) => void
}) {
  const link = (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-8 items-center gap-2.5 rounded-md text-[13px] transition-colors duration-150',
        collapsed ? 'w-8 justify-center' : 'px-2',
        !collapsed && onTogglePin && 'pr-8',
        active
          ? 'bg-primary/[0.12] font-medium text-primary'
          : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
      )}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
      {collapsed ? null : <span className="truncate">{label}</span>}
    </Link>
  )
  // Right-click a row (expanded or icon rail) to pin/unpin it.
  const withMenu = (trigger: React.ReactNode) => (
    <ContextMenu>
      {trigger}
      {onTogglePin ? (
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => onTogglePin(href)} className="gap-2">
            {pinned ? (
              <IconPinnedOff className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            ) : (
              <IconPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            )}
            {pinLabel}
          </ContextMenuItem>
        </ContextMenuContent>
      ) : null}
    </ContextMenu>
  )
  const menuTrigger = (node: React.ReactNode) => (
    <ContextMenuTrigger asChild disabled={!onTogglePin}>
      {node}
    </ContextMenuTrigger>
  )

  if (!collapsed) {
    if (!onTogglePin) return link
    // Pin toggle sits beside the link (not inside it — no nested interactive
    // elements); always shown when pinned, otherwise on row hover or focus.
    return withMenu(
      menuTrigger(
      <div className="group relative">
        {link}
        <button
          type="button"
          onClick={() => onTogglePin(href)}
          aria-label={pinLabel}
          aria-pressed={pinned}
          title={pinLabel}
          className={cn(
            'absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded transition-opacity duration-150 hover:bg-foreground/[0.08] focus-visible:opacity-100 group-hover:opacity-100',
            pinned ? 'text-primary' : 'text-muted-foreground opacity-0 hover:text-foreground',
          )}
        >
          {pinned ? (
            <IconPinnedFilled className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <IconPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>,
      ),
    )
  }
  return withMenu(
    <Tooltip>
      <TooltipTrigger asChild>{menuTrigger(link)}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>,
  )
})

function SidebarSection({
  title,
  tools,
  collapsed,
  pathname,
  label,
  pinnedUrls,
  pinLabel,
  onTogglePin,
}: {
  title: string
  tools: NavLink[]
  collapsed: boolean
  pathname: string
  label: (tool: NavLink) => string
  pinnedUrls: string[]
  pinLabel: (label: string, pinned: boolean) => string
  onTogglePin?: (href: string) => void
}) {
  const [open, setOpen] = useState(true)
  if (tools.length === 0) return null

  const rows = tools.map((tool) => {
    const url = String(tool.url)
    const pinned = pinnedUrls.includes(url)
    const text = label(tool)
    return (
      <SidebarRow
        key={url}
        href={url}
        label={text}
        icon={tool.icon}
        active={isActivePath(pathname, url)}
        collapsed={collapsed}
        pinned={pinned}
        pinLabel={pinLabel(text, pinned)}
        onTogglePin={onTogglePin}
      />
    )
  })

  // Icon rail: no headers, a hairline between groups.
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5 border-t border-border/60 pt-2">{rows}</div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-7 w-full items-center gap-1 rounded-md px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 transition-colors hover:text-foreground"
      >
        <IconChevronRight
          className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-90')}
          aria-hidden
        />
        <span className="truncate">{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-0.5 overflow-hidden"
          >
            {rows}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Left app sidebar: Dashboard, Pinned, then every tool by category.
 * Collapses to a 48px icon rail via the toggle on its border; persists per device.
 */
export function AppSidebar() {
  const pathname = usePathname()
  const tNav = useTranslations('Navigation')
  const tDash = useTranslations('Dashboard')
  const tSidebar = useTranslations('ToolSidebar')
  const pinnedUrls = usePinnedToolsForActiveWorkspace()
  const activeWs = useActiveWorkspace()
  const pinned = buildPinnedNavItems(pinnedUrls, activeWs)
  // From what Pinned actually shows (RBAC-filtered), so no app ever disappears from both.
  const shownPinned = new Set(pinned.map((tool) => String(tool.url)))
  // The saved choice is read once here, after mount (no storage in the prerender).
  const collapsed = useAppSidebarStore((s) => s.collapsed)
  const toggleCollapsed = useAppSidebarStore((s) => s.toggle)
  useEffect(() => useAppSidebarStore.getState().hydrate(), [])
  const toggleLabel = collapsed ? tSidebar('expand') : tSidebar('collapse')

  // Stable across renders so memoized rows don't re-render; reads the active
  // workspace at click time. No workspace yet → nothing to pin into.
  const togglePin = useCallback((url: string) => {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId
    if (wsId) usePinnedToolsStore.getState().togglePin(wsId, url)
  }, [])

  const label = (tool: NavLink) => {
    const key = getToolMessageKey(String(tool.url))
    return key ? tNav(key as never) : tool.title
  }
  const pinLabel = (tool: string, isPinned: boolean) =>
    tSidebar(isPinned ? 'unpin' : 'pin', { tool })
  const sectionProps = { collapsed, pathname, label, pinnedUrls, pinLabel, onTogglePin: togglePin }

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          // relative + z-20: the border toggle overhangs into <main>, which comes
          // later in the DOM and would otherwise paint over it.
          'relative z-20 hidden shrink-0 flex-col border-r border-border bg-[hsl(var(--surface-2))] transition-[width] duration-200 md:flex',
          collapsed ? 'w-12' : 'w-60',
        )}
      >
        {/* Collapse toggle centred on the sidebar's border line. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={toggleLabel}
              aria-expanded={!collapsed}
              className="absolute right-0 top-4 flex h-6 w-6 translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconChevronLeft
                className={cn('h-3.5 w-3.5 transition-transform duration-200', collapsed && 'rotate-180')}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {toggleLabel}
          </TooltipContent>
        </Tooltip>
        <nav
          aria-label="Tools"
          className={cn(
            'no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-3',
            collapsed ? 'items-center px-2' : 'px-3',
          )}
        >
          <SidebarRow
            href="/dashboard"
            label={tNav('dashboard')}
            icon={IconLayoutDashboard}
            active={pathname === '/dashboard'}
            collapsed={collapsed}
          />
          <SidebarSection title={tDash('sections.pinned')} tools={pinned} {...sectionProps} />
          {/* Pinned apps live only in Pinned; a category left empty hides itself. */}
          {CATEGORY_GROUPS.map((group) => (
            <SidebarSection
              key={group.title}
              title={group.title}
              tools={group.tools.filter((tool) => !shownPinned.has(String(tool.url)))}
              {...sectionProps}
            />
          ))}
        </nav>
        <div className={cn('shrink-0 border-t border-border p-2', collapsed && 'flex justify-center')}>
          <AccountMenu variant="sidebar" collapsed={collapsed} />
        </div>
      </aside>
    </TooltipProvider>
  )
}
