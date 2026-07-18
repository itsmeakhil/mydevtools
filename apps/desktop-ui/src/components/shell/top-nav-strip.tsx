'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, Grid2x2Plus, Star, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePinnedToolsForActiveWorkspace, usePinnedToolsStore } from '@/store/pinned-tools-store'
import { useActiveWorkspace } from '@/store/workspace-store'
import { useTabStore } from '@/store/tab-store'
import { getRouteConfig } from '@/lib/route-config'
import { buildPinnedNavItems, getSidebarToolIcon } from '@/components/sidebar/app-sidebar.helpers'
import type { NavLink } from '@/components/sidebar/types'
import { getToolMessageKey } from '@/lib/tool-i18n'

/**
 * Grouped top-nav — replaces the left panel AND the old tab strip. Dashboard,
 * a "Pinned" group of favorites, then one chip per open tool tab (opened tools
 * dock here; ⌥1–9 jumps, ⌥W closes). ⌘K at the end opens the full palette.
 */

/** Icon-only entry (Dashboard, ⌘K) with a hover tooltip. */
function NavIcon({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ElementType
  active?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150',
            active
              ? 'bg-primary/[0.12] text-primary'
              : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
          )}
        >
          <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** The "Pinned" label revealing favorite tools on hover. */
function PinnedMenu({
  tools,
  onNavigate,
  onUnpin,
}: {
  tools: NavLink[]
  onNavigate: (url: string) => void
  onUnpin: (url: string) => void
}) {
  const pathname = usePathname()
  const tNav = useTranslations('Navigation')
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }, [])
  const closeSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 120)
  }, [])

  const groupActive = tools.some((t) => {
    const url = String(t.url)
    return pathname === url || pathname.startsWith(url + '/')
  })

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className={cn(
            'flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[13px] font-medium transition-colors duration-150',
            open || groupActive
              ? 'bg-foreground/[0.06] text-foreground'
              : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
          )}
        >
          <Star
            className={cn('h-3.5 w-3.5', groupActive && 'text-primary')}
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="whitespace-nowrap">Pinned</span>
          <ChevronDown className="h-3 w-3 opacity-50" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        className="max-h-[70vh] w-56 overflow-y-auto"
      >
        {tools.map((t) => {
          const url = String(t.url)
          const active = pathname === url || pathname.startsWith(url + '/')
          const key = getToolMessageKey(url)
          const label = key ? tNav(key as never) : t.title
          const Icon = t.icon
          return (
            <DropdownMenuItem
              key={url}
              onSelect={() => onNavigate(url)}
              className={cn('cursor-pointer gap-2.5', active && 'text-primary')}
            >
              {Icon ? (
                <Icon
                  className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden
                />
              ) : null}
              <span className="truncate">{label}</span>
              <button
                type="button"
                aria-label={`Unpin ${label}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onUnpin(url)
                }}
                className="ml-auto shrink-0 rounded p-0.5 text-primary opacity-80 transition-opacity hover:opacity-100"
              >
                <Star className="h-3.5 w-3.5 fill-primary" aria-hidden />
              </button>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TopNavStrip() {
  const router = useRouter()
  const pathname = usePathname()
  const tNav = useTranslations('Navigation')
  const pinnedTools = usePinnedToolsForActiveWorkspace()
  const activeWs = useActiveWorkspace()
  const pinned = buildPinnedNavItems(pinnedTools, activeWs)
  const togglePin = usePinnedToolsStore((s) => s.togglePin)
  const { tabs, closeTab } = useTabStore()
  const unpin = useCallback(
    (url: string) => {
      if (activeWs) togglePin(activeWs.id, url)
    },
    [activeWs, togglePin],
  )

  const navigate = useCallback((url: string) => router.push(url), [router])
  const openPalette = useCallback(() => {
    document.dispatchEvent(new CustomEvent('open-command-palette'))
  }, [])

  const closeTabAndNavigate = useCallback(
    (path: string) => {
      const { tabs, activeTabPath } = useTabStore.getState()
      const idx = tabs.findIndex((t) => t.path === path)
      const newTabs = tabs.filter((t) => t.path !== path)
      if (activeTabPath === path) {
        const next = newTabs[idx]?.path ?? newTabs[Math.max(0, idx - 1)]?.path ?? null
        router.push(next ?? '/dashboard')
      }
      closeTab(path)
    },
    [router, closeTab],
  )

  // Keyboard shortcuts: ⌥1–9 jump to tab, ⌥W close active tab.
  // (⌘W / ⌘1–9 are browser-reserved and cannot be intercepted.)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // e.code is layout-independent — on macOS ⌥ changes e.key ('w' → '∑').
      if (e.code === 'KeyW') {
        const { activeTabPath } = useTabStore.getState()
        if (!activeTabPath) return
        e.preventDefault()
        closeTabAndNavigate(activeTabPath)
        return
      }
      const digit = /^Digit([1-9])$/.exec(e.code)
      if (digit) {
        const { tabs, activeTabPath } = useTabStore.getState()
        const tab = tabs[Number(digit[1]) - 1]
        if (!tab) return
        e.preventDefault()
        if (tab.path !== activeTabPath) router.push(tab.path)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router, closeTabAndNavigate])

  const isDashboard = pathname === '/dashboard'

  // Edge-fade affordance: show a fade only on the side that has more to scroll.
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const updateScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScroll()
    el.addEventListener('scroll', updateScroll, { passive: true })
    const ro = new ResizeObserver(updateScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScroll)
      ro.disconnect()
    }
  }, [updateScroll, tabs.length, pinned.length])

  // Keep the active tab chip in view when it changes.
  useEffect(() => {
    const btn = activeTabRef.current
    const container = scrollRef.current
    if (!btn || !container) return
    const { offsetLeft, offsetWidth } = btn
    const { scrollLeft, clientWidth } = container
    if (offsetLeft < scrollLeft) {
      container.scrollTo({ left: offsetLeft - 8, behavior: 'smooth' })
    } else if (offsetLeft + offsetWidth > scrollLeft + clientWidth) {
      container.scrollTo({ left: offsetLeft + offsetWidth - clientWidth + 8, behavior: 'smooth' })
    }
  }, [pathname])

  return (
    <TooltipProvider delayDuration={300}>
      <nav aria-label="Tools" className="flex min-w-0 items-center gap-1">
        <NavIcon
          label="Dashboard"
          icon={LayoutDashboard}
          active={isDashboard}
          onClick={() => router.push('/dashboard')}
        />

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />

        {/* Pinned stays fixed — only the tab strip scrolls. */}
        {pinned.length > 0 ? (
          <>
            <PinnedMenu tools={pinned} onNavigate={navigate} onUnpin={unpin} />
            <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
          </>
        ) : null}

        {/* overflow-hidden wrapper physically clips the horizontal scrollbar
            (which the scroll child pushes below its own box via pb+/-mb). */}
        <div className="relative flex min-w-0 items-center overflow-hidden">
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[hsl(var(--surface-2))] to-transparent transition-opacity duration-200',
              canScrollLeft ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            ref={scrollRef}
            className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden"
            style={{ paddingBottom: 24, marginBottom: -24 }}
          >
            {/* Open tool tabs — one per open tool, docked next to Pinned.
                Same design as the old tab strip: 1px bifurcation between two
                inactive neighbours, suppressed next to the active tab, always
                occupying 1px so tabs never shift when the divider toggles.
                gap-0 wrapper so dividers sit flush like the old strip. */}
            <div className="flex shrink-0 items-center">
            {tabs.map((tab, i) => {
              const config = getRouteConfig(tab.path)
              const key = getToolMessageKey(tab.path)
              const title =
                (key ? tNav(key as never) : config?.title) ??
                tab.path.split('/').pop() ??
                tab.path
              const Icon = getSidebarToolIcon(tab.path) ?? config?.icon
              const isActive = pathname === tab.path
              const prevActive = i > 0 && tabs[i - 1].path === pathname
              const showDivider = i > 0 && !isActive && !prevActive
              return (
                <React.Fragment key={tab.path}>
                  {i > 0 ? (
                    <div
                      aria-hidden
                      className={cn(
                        'h-5 w-px shrink-0 self-center bg-border transition-opacity duration-150',
                        showDivider ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        ref={isActive ? activeTabRef : undefined}
                        onClick={() => {
                          if (tab.path !== pathname) router.push(tab.path)
                        }}
                        className={cn(
                          'group relative flex h-8 min-w-[144px] max-w-[230px] shrink-0 cursor-pointer items-center gap-2.5 rounded-md border px-3 text-[13px] font-medium leading-none transition-colors duration-150',
                          isActive
                            ? 'border-border bg-[hsl(var(--surface-1))] text-foreground'
                            : 'border-transparent text-foreground/60 hover:bg-foreground/[0.05] hover:text-foreground/90',
                        )}
                      >
                        {isActive && (
                          <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-md bg-primary" />
                        )}
                        {Icon ? (
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 transition-colors',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground/70 group-hover:text-foreground/70',
                            )}
                            aria-hidden
                          />
                        ) : null}
                        <span className="min-w-0 flex-1 truncate text-left">{title}</span>
                        <span
                          role="button"
                          aria-label={`Close ${title}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            closeTabAndNavigate(tab.path)
                          }}
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-100 hover:bg-[hsl(var(--surface-3))] hover:text-foreground',
                            isActive
                              ? 'text-muted-foreground opacity-100'
                              : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100',
                          )}
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="flex items-center gap-1.5 text-xs">
                      {title}
                      {i < 9 ? (
                        <kbd className="rounded border border-border/60 bg-muted/60 px-1 font-mono text-[10px] text-muted-foreground">
                          ⌥{i + 1}
                        </kbd>
                      ) : null}
                    </TooltipContent>
                  </Tooltip>
                </React.Fragment>
              )
            })}
            </div>
          </div>
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[hsl(var(--surface-2))] to-transparent transition-opacity duration-200',
              canScrollRight ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />

        <NavIcon label="Open tool (⌘K)" icon={Grid2x2Plus} onClick={openPalette} />
      </nav>
    </TooltipProvider>
  )
}
