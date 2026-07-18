'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, LayoutGrid, Star, ChevronDown } from 'lucide-react'
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
import {
  buildPinnedNavItems,
  buildCategoryGroups,
} from '@/components/sidebar/app-sidebar.helpers'
import type { NavLink } from '@/components/sidebar/types'
import { getToolMessageKey } from '@/lib/tool-i18n'

/**
 * Grouped top-nav — replaces the left panel. Dashboard, a "Pinned" group of
 * favorites, then each tool category; hovering a group drops its tools down.
 * ⌘K at the end opens the full palette. Reuses the exact pinned + catalog data.
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

/** A group label that reveals its tools on hover (Pinned or a category). */
function GroupMenu({
  label,
  leadingIcon: LeadingIcon,
  tools,
  onNavigate,
  onUnpin,
}: {
  label: string
  leadingIcon?: React.ElementType
  tools: NavLink[]
  onNavigate: (url: string) => void
  onUnpin?: (url: string) => void
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
          {LeadingIcon ? (
            <LeadingIcon
              className={cn('h-3.5 w-3.5', groupActive && 'text-primary')}
              strokeWidth={1.75}
              aria-hidden
            />
          ) : null}
          <span className="whitespace-nowrap">{label}</span>
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
              {onUnpin ? (
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
              ) : null}
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
  const pinnedTools = usePinnedToolsForActiveWorkspace()
  const activeWs = useActiveWorkspace()
  const pinned = buildPinnedNavItems(pinnedTools, activeWs)
  const categories = useMemo(() => buildCategoryGroups(), [])
  const togglePin = usePinnedToolsStore((s) => s.togglePin)
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

  const isDashboard = pathname === '/dashboard'

  // Edge-fade affordance: show a fade only on the side that has more to scroll.
  const scrollRef = useRef<HTMLDivElement>(null)
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
  }, [updateScroll, categories.length, pinned.length])

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
            {pinned.length > 0 ? (
              <GroupMenu
                label="Pinned"
                leadingIcon={Star}
                tools={pinned}
                onNavigate={navigate}
                onUnpin={unpin}
              />
            ) : null}
            {categories.map((group) => (
              <GroupMenu
                key={group.title}
                label={group.title}
                tools={group.tools}
                onNavigate={navigate}
              />
            ))}
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

        <NavIcon label="All tools · ⌘K" icon={LayoutGrid} onClick={openPalette} />
      </nav>
    </TooltipProvider>
  )
}
