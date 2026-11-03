'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTabStore } from '@/store/tab-store'
import { getRouteConfig } from '@/lib/route-config'
import { getSidebarToolMeta } from '@/components/sidebar/app-sidebar.helpers'
import { getToolMessageKey } from '@/lib/tool-i18n'

/**
 * Toolbar tab strip — one chip per open tool (opened tools dock here; ⌥1–9
 * jumps, ⌥W closes, drag to reorder). Navigation lives in the sidebar.
 */

/** Icon-only entry (Dashboard, ⌘K) with a hover tooltip. */
export function NavIcon({
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
            'liquid flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[color,transform] duration-150 active:scale-95',
            active ? 'text-primary' : 'text-foreground/70 hover:text-foreground',
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

export function TopNavStrip() {
  const router = useRouter()
  const pathname = usePathname()
  const tNav = useTranslations('Navigation')
  const tShell = useTranslations('Shell')
  const { tabs, closeTab, moveTab } = useTabStore()

  // Drag-to-reorder (native HTML5 DnD, same as the API-client tab bar).
  const [draggedPath, setDraggedPath] = useState<string | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
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

  // Edge-fade affordance: show a fade only on the side that has more to scroll.
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)
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
  }, [updateScroll, tabs.length])

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
      {tabs.length === 0 ? null : (
      <nav aria-label="Tools" className="liquid flex h-10 min-w-0 items-center rounded-full px-1">
        {/* overflow-hidden wrapper physically clips the horizontal scrollbar
            (which the scroll child pushes below its own box via pb+/-mb). */}
        <div className="relative flex min-w-0 items-center overflow-hidden">
          <div
            ref={scrollRef}
            className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden"
            style={{
              paddingBottom: 24,
              marginBottom: -24,
              maskImage: `linear-gradient(90deg, ${canScrollLeft ? 'transparent' : '#000'}, #000 28px, #000 calc(100% - 28px), ${canScrollRight ? 'transparent' : '#000'})`,
              WebkitMaskImage: `linear-gradient(90deg, ${canScrollLeft ? 'transparent' : '#000'}, #000 28px, #000 calc(100% - 28px), ${canScrollRight ? 'transparent' : '#000'})`,
            }}
          >
            {/* Open tool tabs — pill chips inside the glass capsule. */}
            <div className="flex shrink-0 items-center gap-0.5">
            {tabs.map((tab, i) => {
              const config = getRouteConfig(tab.path)
              const key = getToolMessageKey(tab.path)
              const title =
                (key ? tNav(key as never) : config?.title) ??
                tab.path.split('/').pop() ??
                tab.path
              // Per-tool @tabler sidebar icon (same as Pinned/sidebar); the
              // generic route-config lucide icon only when the catalog has none.
              const meta = getSidebarToolMeta(tab.path)
              const Icon = meta?.icon ?? config?.icon
              const isActive = pathname === tab.path
              return (
                <React.Fragment key={tab.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* div, not <button>: WebKit/Firefox refuse to start a
                          native drag from a form control. */}
                      <div
                        role="button"
                        tabIndex={0}
                        ref={isActive ? activeTabRef : undefined}
                        draggable
                        onDragStart={(e) => {
                          setDraggedPath(tab.path)
                          e.dataTransfer.effectAllowed = 'move'
                          // Firefox refuses to start a drag without payload.
                          e.dataTransfer.setData('text/plain', tab.path)
                        }}
                        onDragOver={(e) => {
                          if (!draggedPath) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          if (tab.path !== draggedPath) setDragOverPath(tab.path)
                        }}
                        onDragLeave={() => setDragOverPath((p) => (p === tab.path ? null : p))}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (draggedPath) moveTab(draggedPath, tab.path)
                          setDraggedPath(null)
                          setDragOverPath(null)
                        }}
                        onDragEnd={() => {
                          setDraggedPath(null)
                          setDragOverPath(null)
                        }}
                        onClick={() => {
                          if (tab.path !== pathname) router.push(tab.path)
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return
                          e.preventDefault()
                          if (tab.path !== pathname) router.push(tab.path)
                        }}
                        className={cn(
                          'group relative flex h-8 min-w-[128px] max-w-[210px] shrink-0 select-none items-center gap-2 rounded-full px-3 text-[13px] leading-none outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring',
                          isActive
                            ? 'bg-[hsl(var(--segment-active))] font-medium text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.12),inset_0_1px_0_rgb(255_255_255/0.5)]'
                            : 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground',
                          draggedPath === tab.path && 'opacity-40',
                          dragOverPath === tab.path &&
                            draggedPath !== tab.path &&
                            'ring-2 ring-inset ring-primary/50',
                        )}
                      >
                        {Icon ? (
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              isActive ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-foreground/80',
                            )}
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        ) : null}
                        <span className="min-w-0 flex-1 truncate text-left">{title}</span>
                        <span
                          role="button"
                          aria-label={tShell('closeTab', { title })}
                          onClick={(e) => {
                            e.stopPropagation()
                            closeTabAndNavigate(tab.path)
                          }}
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-100 hover:bg-foreground/[0.1] hover:text-foreground',
                            isActive
                              ? 'text-muted-foreground opacity-100'
                              : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100',
                          )}
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="flex items-center gap-1.5 text-xs">
                      {title}
                      {i < 9 ? (
                        <kbd className="font-sans text-[11px] text-muted-foreground">
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
        </div>

      </nav>
      )}
    </TooltipProvider>
  )
}
