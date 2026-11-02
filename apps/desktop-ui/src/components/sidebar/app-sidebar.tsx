'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import {
  IconChevronRight,
  IconLayoutDashboard,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePinnedToolsForActiveWorkspace } from '@/store/pinned-tools-store'
import { useActiveWorkspace } from '@/store/workspace-store'
import { getToolMessageKey } from '@/lib/tool-i18n'
import { buildCategoryGroups, buildPinnedNavItems } from './app-sidebar.helpers'
import type { NavLink } from './types'

const COLLAPSED_KEY = 'mdt-app-sidebar-collapsed'
const CATEGORY_GROUPS = buildCategoryGroups()

const isActivePath = (pathname: string, url: string) =>
  pathname === url || pathname.startsWith(url + '/')

const SidebarRow = React.memo(function SidebarRow({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string
  label: string
  icon?: React.ElementType
  active: boolean
  collapsed: boolean
}) {
  const link = (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-8 items-center gap-2.5 rounded-md text-[13px] transition-colors duration-150',
        collapsed ? 'w-8 justify-center' : 'px-2',
        active
          ? 'bg-primary/[0.12] font-medium text-primary'
          : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
      )}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
      {collapsed ? null : <span className="truncate">{label}</span>}
    </Link>
  )
  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
})

function SidebarSection({
  title,
  tools,
  collapsed,
  pathname,
  label,
}: {
  title: string
  tools: NavLink[]
  collapsed: boolean
  pathname: string
  label: (tool: NavLink) => string
}) {
  const [open, setOpen] = useState(true)
  if (tools.length === 0) return null

  const rows = tools.map((tool) => {
    const url = String(tool.url)
    return (
      <SidebarRow
        key={url}
        href={url}
        label={label(tool)}
        icon={tool.icon}
        active={isActivePath(pathname, url)}
        collapsed={collapsed}
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
 * Collapses to a 48px icon rail; the choice persists per device.
 */
export function AppSidebar() {
  const pathname = usePathname()
  const tNav = useTranslations('Navigation')
  const tDash = useTranslations('Dashboard')
  const tSidebar = useTranslations('ToolSidebar')
  const pinned = buildPinnedNavItems(usePinnedToolsForActiveWorkspace(), useActiveWorkspace())

  // Read after mount: localStorage is unavailable during the static prerender.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
    } catch {}
  }, [])
  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {}
  }

  const label = (tool: NavLink) => {
    const key = getToolMessageKey(String(tool.url))
    return key ? tNav(key as never) : tool.title
  }
  const ToggleIcon = collapsed ? IconLayoutSidebarLeftExpand : IconLayoutSidebarLeftCollapse
  const toggleLabel = collapsed ? tSidebar('expand') : tSidebar('collapse')

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-[hsl(var(--surface-2))] transition-[width] duration-200 md:flex',
          collapsed ? 'w-12' : 'w-60',
        )}
      >
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
          <SidebarSection
            title={tDash('sections.pinned')}
            tools={pinned}
            collapsed={collapsed}
            pathname={pathname}
            label={label}
          />
          {CATEGORY_GROUPS.map((group) => (
            <SidebarSection
              key={group.title}
              title={group.title}
              tools={group.tools}
              collapsed={collapsed}
              pathname={pathname}
              label={label}
            />
          ))}
        </nav>
        <div className={cn('border-t border-border p-2', collapsed ? 'flex justify-center' : '')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggle}
                aria-label={toggleLabel}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <ToggleIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {toggleLabel}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
