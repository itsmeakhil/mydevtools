'use client'

import React, { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import {
  IconChevronRight,
  IconHelpCircle,
  IconLayoutDashboard,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMoon,
  IconPin,
  IconPinnedOff,
  IconSearch,
  IconSelector,
  IconSettings,
  IconStarFilled,
} from '@tabler/icons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Logo } from '@/components/logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ModeToggle } from '@/components/modeToggle'
import { useAppUser } from '@/hooks/use-app-user'
import { usePinnedToolsForActiveWorkspace, usePinnedToolsStore, usePinWorkspaceId } from '@/store/pinned-tools-store'
import { normalizePinnedToolPath } from '@/lib/pinned-tools-path'
import { useActiveWorkspace } from '@/store/workspace-store'
import { useTerminalStore } from '@/store/terminal-store'
import { totalWaiting } from '@/lib/terminal/status'
import { buildCategoryGroups, buildPinnedNavItems } from '@/components/sidebar/app-sidebar.helpers'
import type { NavLink } from '@/components/sidebar/types'
import { getToolMessageKey } from '@/lib/tool-i18n'
import { cn } from '@/lib/utils'
import { useMacChrome, useSidebarState } from './use-mac-chrome'

const CATEGORIES = buildCategoryGroups()

/** True when the sidebar is collapsed to the 72px icon rail. */
const RailContext = React.createContext(false)

const isActivePath = (pathname: string, url: string) =>
  pathname === url || pathname.startsWith(url + '/')

/** Sidebar toggle — always at the toolbar's leading edge, expanded or collapsed. */
export function SidebarToggle() {
  const t = useTranslations('Shell')
  const toggle = useSidebarState((s) => s.toggle)
  const collapsed = useSidebarState((s) => s.collapsed)
  const Icon = collapsed ? IconLayoutSidebarLeftExpand : IconLayoutSidebarLeftCollapse
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('toggleSidebar')}
      title={`${t('toggleSidebar')} (⌃⌘S)`}
      className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.07] hover:text-foreground md:flex"
    >
      <Icon className="h-[18px] w-[18px]" stroke={1.6} aria-hidden />
    </button>
  )
}

const SidebarRow = React.memo(function SidebarRow({
  label,
  icon: Icon,
  active,
  onClick,
  pinned,
  pinLabel,
  onTogglePin,
  badge = 0,
  badgeLabel,
}: {
  label: string
  icon?: React.ElementType
  active: boolean
  onClick: () => void
  pinned?: boolean
  pinLabel?: string
  onTogglePin?: () => void
  /** Attention count (e.g. terminals waiting); hidden at 0. */
  badge?: number
  /** Spoken form of the badge, e.g. "Needs you · 2". */
  badgeLabel?: string
}) {
  const rail = React.useContext(RailContext)
  if (rail) onTogglePin = undefined
  const showBadge = badge > 0
  return (
    <div className="group/row relative">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        aria-label={rail ? (showBadge && badgeLabel ? `${label}, ${badgeLabel}` : label) : undefined}
        title={rail ? label : undefined}
        className={cn(
          'group flex h-8 w-full items-center gap-2.5 rounded-lg text-left text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          rail ? 'h-9 justify-center px-0' : 'px-2.5',
          onTogglePin && 'pr-8',
          active
            ? 'bg-primary/[0.14] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] dark:bg-primary/[0.2]'
            : 'text-sidebar-foreground hover:bg-foreground/[0.05] hover:text-foreground',
        )}
      >
        {Icon ? (
          <span className="relative flex shrink-0">
            <Icon
              className={cn(
                'h-[17px] w-[17px] shrink-0 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/80',
              )}
              stroke={1.7}
              aria-hidden
            />
            {rail && showBadge ? (
              <span
                data-sidebar-badge="dot"
                aria-hidden
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive"
              />
            ) : null}
          </span>
        ) : null}
        {rail ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
        {!rail && showBadge ? (
          <>
            <span
              data-sidebar-badge="count"
              aria-hidden
              className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold tabular-nums text-destructive-foreground"
            >{badge}</span>
            {badgeLabel ? <span className="sr-only">{badgeLabel}</span> : null}
          </>
        ) : null}
      </button>
      {onTogglePin ? (
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={pinLabel}
          aria-pressed={pinned}
          title={pinLabel}
          className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-foreground/[0.07] hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 group-hover/row:opacity-100"
        >
          {pinned ? (
            <IconPinnedOff className="h-3.5 w-3.5" stroke={1.8} aria-hidden />
          ) : (
            <IconPin className="h-3.5 w-3.5" stroke={1.8} aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  )
})

function SidebarSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon?: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const rail = React.useContext(RailContext)
  if (rail) return <div className="flex flex-col gap-0.5 pt-3">{children}</div>
  return (
    <div className="pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex h-6 w-full items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold tracking-[0.01em] text-muted-foreground/90 transition-colors hover:text-foreground"
      >
        {Icon ? <Icon className="h-3 w-3 text-primary" aria-hidden /> : null}
        <span className="flex-1 truncate text-left">{title}</span>
        <IconChevronRight
          className={cn(
            'h-3 w-3 opacity-0 transition-[transform,opacity] duration-200 group-hover:opacity-70',
            open && 'rotate-90',
          )}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-px pt-0.5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function AccountMenu() {
  const t = useTranslations('Shell')
  const tNav = useTranslations('Navigation')
  const router = useRouter()
  const user = useAppUser()
  const displayName = user.name?.trim() || t('you')
  const rail = React.useContext(RailContext)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('account')}
          className={cn(
            'flex h-11 w-full items-center gap-2.5 rounded-xl text-left transition-colors duration-150 hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-foreground/[0.06]',
            rail ? 'justify-center px-0' : 'px-2',
          )}
        >
          <Avatar className="h-7 w-7 shadow-elev-1 ring-1 ring-foreground/10">
            {user.avatar ? <AvatarImage src={user.avatar} alt={displayName} /> : null}
            <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
              {displayName[0]!.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {rail ? null : (
            <>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{displayName}</span>
              <IconSelector className="h-4 w-4 shrink-0 text-muted-foreground" stroke={1.6} aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="min-w-56">
        <DropdownMenuItem onSelect={() => router.push('/settings')} className="gap-2.5">
          <IconSettings className="h-4 w-4 text-muted-foreground" stroke={1.7} /> {tNav('settings')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/help')} className="gap-2.5">
          <IconHelpCircle className="h-4 w-4 text-muted-foreground" stroke={1.7} /> {t('help')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="flex items-center gap-2.5 text-sm">
            <IconMoon className="h-4 w-4 text-muted-foreground" stroke={1.7} aria-hidden /> {t('theme')}
          </span>
          <ModeToggle />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Source-list sidebar as a floating Liquid Glass pane (.liquid); collapses to a
 * 72px icon rail (⌃⌘S) that still holds the traffic lights. On macOS the
 * window is transparent with native vibrancy (tauri.macos.conf.json), so the
 * pane frosts the real desktop; elsewhere it frosts the accent backdrop.
 */
export function AppSidebar() {
  const t = useTranslations('Shell')
  const tNav = useTranslations('Navigation')
  const tDash = useTranslations('Dashboard')
  const router = useRouter()
  const pathname = usePathname()
  const collapsed = useSidebarState((s) => s.collapsed)
  const { trafficLightInset } = useMacChrome()
  const tSide = useTranslations('ToolSidebar')
  const tTerm = useTranslations('Terminal')
  // Select only the number so status churn re-renders the sidebar just when the count changes.
  const terminalWaiting = useTerminalStore((s) => totalWaiting(s.projects, s.statuses))
  const pinnedUrls = usePinnedToolsForActiveWorkspace()
  const activeWorkspace = useActiveWorkspace()
  const togglePin = usePinnedToolsStore((s) => s.togglePin)
  const pinWorkspaceId = usePinWorkspaceId()
  const pinned = buildPinnedNavItems(pinnedUrls, activeWorkspace)
  const isPinned = (url: string) => pinnedUrls.includes(normalizePinnedToolPath(url))
  // Pinned tools leave their category; categories left empty are hidden.
  const categories = CATEGORIES.map((g) => ({
    ...g,
    tools: g.tools.filter((tool) => !isPinned(String(tool.url))),
  })).filter((g) => g.tools.length > 0)

  const go = useCallback((url: string) => router.push(url), [router])
  const label = (tool: NavLink) => {
    const key = getToolMessageKey(String(tool.url))
    return key ? tNav(key as never) : tool.title
  }
  const row = (tool: NavLink) => {
    const url = String(tool.url)
    const name = label(tool)
    const on = isPinned(url)
    const badge = url === '/app/terminal' ? terminalWaiting : 0
    return (
      <SidebarRow
        key={url}
        label={name}
        icon={tool.icon}
        active={isActivePath(pathname, url)}
        onClick={() => go(url)}
        pinned={on}
        pinLabel={tSide(on ? 'unpin' : 'pin', { tool: name })}
        onTogglePin={() => togglePin(pinWorkspaceId, url)}
        badge={badge}
        badgeLabel={badge > 0 ? tTerm('needsYou', { count: badge }) : undefined}
      />
    )
  }

  const rail = collapsed

  return (
    <RailContext.Provider value={rail}>
    <aside
      aria-label={t('sidebar')}
      className={cn(
        'liquid chrome hidden shrink-0 flex-col overflow-hidden rounded-[22px] transition-[width] duration-300 ease-[cubic-bezier(0.32,1.2,0.56,1)] md:flex',
        rail ? 'w-[72px]' : 'w-[var(--sidebar-width)]',
      )}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {/* Traffic-light row (macOS Overlay title bar) — drag region. Elsewhere
            (fullscreen, Linux/Windows, browser) just top padding. */}
        {trafficLightInset ? (
          <div data-tauri-drag-region className="h-10 shrink-0" />
        ) : (
          <div data-tauri-drag-region className="h-3 shrink-0" />
        )}

        {/* Brand → dashboard. Mark sits on the same column as the row icons;
            the rail shows the mark alone, centred. */}
        <div className={cn('px-3 pb-3', rail && 'flex justify-center')}>
          <button
            type="button"
            onClick={() => go('/dashboard')}
            aria-label={t('goToDashboard')}
            title={rail ? 'MyDevTools' : undefined}
            className={cn(
              'flex items-center rounded-xl transition-colors duration-150 hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              rail ? 'h-10 w-10 justify-center' : 'h-10 w-full gap-2.5 px-2',
            )}
          >
            <Logo size={rail ? 24 : 22} showText={false} className="shrink-0" />
            {rail ? null : (
              <span
                className="truncate text-[15px] font-bold leading-none tracking-wide"
                style={{ fontFamily: 'var(--font-courier-prime), ui-monospace, monospace' }}
              >
                mydevtools<span className="text-primary">.tech</span>
              </span>
            )}
          </button>
        </div>

        <div className="px-3 pb-1">
          <button
            type="button"
            onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
            aria-label={rail ? t('searchTools') : undefined}
            title={rail ? `${t('searchTools')} (⌘K)` : undefined}
            className={cn(
              'flex h-8 w-full items-center gap-2 rounded-full bg-foreground/[0.06] text-[13px] text-muted-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] transition-colors duration-150 hover:bg-foreground/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              rail ? 'justify-center px-0' : 'px-3',
            )}
          >
            <IconSearch className="h-[15px] w-[15px]" stroke={1.8} aria-hidden />
            {rail ? null : (
              <>
                <span className="flex-1 text-left">{t('searchTools')}</span>
                <kbd className="font-sans text-[11px] text-muted-foreground/80">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        <nav className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
          <SidebarRow
            label={tNav('dashboard')}
            icon={IconLayoutDashboard}
            active={pathname === '/dashboard'}
            onClick={() => go('/dashboard')}
          />
          {pinned.length > 0 ? (
            <SidebarSection title={tDash('sections.pinned')} icon={IconStarFilled}>
              {pinned.map(row)}
            </SidebarSection>
          ) : null}
          {categories.map((group) => (
            <SidebarSection key={group.title} title={group.title}>
              {group.tools.map(row)}
            </SidebarSection>
          ))}
        </nav>

        <div className="shrink-0 border-t border-foreground/[0.07] p-2">
          <AccountMenu />
        </div>
      </div>
    </aside>
    </RailContext.Provider>
  )
}
